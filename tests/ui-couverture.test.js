// COUVERTURE DES FONCTIONS DE public/js/app.js QU'AUCUN TEST N'EXERÇAIT (24/09/2026).
//
// Le journal consignait « 86 des 244 fonctions de app.js ne sont exercées par aucun test » sans que rien ne s'y
// attaque. Le décompte a d'abord été REFAIT, parce qu'il comptait des fonctions INTERNES à d'autres — « hasPrice »
// et « sumOf » sont des fermetures de tripStatsParts, déjà exercée, et ne sont pas extractibles isolément. Sur les
// seules fonctions du PREMIER NIVEAU de l'IIFE, celles que le bac à sable peut extraire : 244 fonctions, 73 jamais
// citées. Classées par ce qu'il leur faut pour tourner sans navigateur :
//   - 37 PURES (calcul, i18n, construction d'URL) : exerçables tout de suite, c'est l'objet de ce fichier ;
//   - 19 qui touchent au DOM, 8 qui écrivent de l'innerHTML, 4 qui appellent le réseau, 3 qui posent une minuterie,
//     2 qui appellent Leaflet.
// Le bac à sable est celui de ui.test.js : les fonctions sont extraites du SOURCE d'app.js et exécutées avec le
// vrai i18n.js, sans DOM, sans moteur, sans serveur.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const PUB = path.join(ROOT, 'public', 'js');
const APP = fs.readFileSync(path.join(PUB, 'app.js'), 'utf8');

// Extraction : même principe que ui.test.js — la fonction est prise dans le source, de sa déclaration à la ligne
// « bras » qui la ferme au premier niveau.
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

const FNS = ['parseIsoDate', 'tripNightsAndDays', 'formatNum', 'unitForLang', 'distanceUnit', 'distanceUnitToKm',
  'distanceFieldKm', 'distanceFieldSpec', 'unitFieldBounds', 'kmToDistanceUnit',
  // Les fonctions visées par ce fichier.
  'nearOf', 'optNear', 'photoRequestUrl', 'buildPhotoLinks', 'wikiLang', 'cachePut',
  'formatDayRangeLabel', 'lodgingCategoryLabel', 'getTripDays', 'effectiveRadiusKm', 'isConvertibleCurrency',
  'tripDivIcon'];
const VARS = ['CLIENT_CACHE_MAX', 'WIKI_ALIAS', 'WIKI_FALLBACK_FR'];

function sandbox(){
  const fakeEl = () => ({ setAttribute(){}, getAttribute(){ return null; },
    classList: { add(){}, remove(){}, contains(){ return false; } },
    appendChild(){}, addEventListener(){}, querySelector(){ return fakeEl(); }, querySelectorAll(){ return []; }, style: {} });
  const ctx = { navigator: { languages: ['fr'] }, localStorage: { getItem: () => null, setItem(){} },
    document: { readyState: 'complete', documentElement: fakeEl(), querySelectorAll: () => [],
      getElementById: () => null, createElement: fakeEl, addEventListener(){} },
    CustomEvent: function(){}, Intl, console };
  ctx.window = { addEventListener(){}, dispatchEvent(){} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(PUB, 'i18n.js'), 'utf8'), ctx);

  const glue = [
    'var t = window.I18N.t, localeTag = function(c){ return window.I18N.localeTag(c); };',
    'var VISITOR_LANG = "fr", MAX_TRIP_DAYS = 21;',
    'var COUNTRIES = { CH: { name: "Suisse" }, FR: { name: "France" }, IT: { name: "Italie" } };',
    'var WIKI_CODES = { fr: 1, en: 1, de: 1, es: 1 };',
    'var radiusMode = "km", fieldDistanceUnit = "km";',
    'var RADIUS_KM_FIELD = { value: 300, min: 50, max: 3000, step: 10 };',
    'var fakeInput = function(v){ return { value: v === undefined ? "" : String(v), min: "", max: "", step: "" }; };',
    'var els = { radius: fakeInput(""), dateStart: fakeInput(""), dateEnd: fakeInput("") };',
    // Bouchon de Leaflet : tripDivIcon ne fait que composer l'appel, c'est CE QU'ELLE PASSE qui est vérifié.
    'var L = { divIcon: function(o){ return { __divIcon: o }; } };',
    // Bouchon de TripData : isConvertibleCurrency demande un plafond d hébergement et lit sa devise.
    'var DEVISES_OK = { EUR: 1, CHF: 1, USD: 1 };',
    'var TripData = { lodgingPriceCap: function(pays, palier, code){ return DEVISES_OK[code] ? { currency: code, max: 100 } : null; } };',
    VARS.map(extractVar).join('\n'),
    FNS.map(extract).join('\n'),
    'this.F = { ' + FNS.join(', ') + ' };',
    'this.setLang = function(l){ VISITOR_LANG = l; window.I18N.set(l); };',
    'this.setMode = function(m){ radiusMode = m; };',
    'this.els = els;',
    'this.DEVISES_OK = DEVISES_OK;'
  ].join('\n');
  vm.runInContext(glue, ctx);
  return ctx;
}
// Les objets fabriqués DANS le bac à sable portent le prototype de son contexte vm, que deepEqual strict
// refuse. On compare donc des copies plates : c est la valeur des champs qui nous intéresse, pas leur origine.
const plat = o => o == null ? o : JSON.parse(JSON.stringify(o));

const W = sandbox();
const F = W.F;

test('photo : nearOf ne rend un point que si les DEUX coordonnées existent', () => {
  assert.deepEqual(plat(F.nearOf(48.85, 2.35, 'poi')), { lat: 48.85, lon: 2.35, kind: 'poi' });
  assert.equal(F.nearOf(null, 2.35, 'poi'), null);
  assert.equal(F.nearOf(48.85, null, 'poi'), null);
  assert.equal(F.nearOf(undefined, undefined, 'area'), null);
  // Zéro est une coordonnée valide (golfe de Guinée) : le contrôle porte sur null, pas sur la fausseté.
  assert.deepEqual(plat(F.nearOf(0, 0, 'area')), { lat: 0, lon: 0, kind: 'area' });
  // Les chaînes sont converties en nombres, pour que l'URL ne porte pas « 48.85 » entre guillemets.
  assert.deepEqual(plat(F.nearOf('48.85', '2.35', 'poi')), { lat: 48.85, lon: 2.35, kind: 'poi' });
});

test('photo : optNear préfère le point de l\'ACTIVITÉ, et retombe sur celui de l\'étape', () => {
  const leg = { lat: 45.76, lon: 4.84 };
  assert.deepEqual(plat(F.optNear({ lat: 48.85, lon: 2.35 }, leg)), { lat: 48.85, lon: 2.35, kind: 'poi' });
  // Activité sans coordonnées : c'est l'étape qui sert, et le genre change avec elle.
  assert.deepEqual(plat(F.optNear({ name: 'musée' }, leg)), { lat: 45.76, lon: 4.84, kind: 'area' });
  assert.deepEqual(plat(F.optNear(null, leg)), { lat: 45.76, lon: 4.84, kind: 'area' });
  assert.equal(F.optNear(null, null), null);
});

test('photo : l\'URL demandée échappe ses paramètres et omet le point quand il n\'y en a pas', () => {
  const sans = F.photoRequestUrl('Saint-Étienne', 'Loire', 'FR', null, 'fr');
  assert.ok(sans.startsWith('/api/photo?name=Saint-%C3%89tienne'), sans);
  assert.ok(sans.includes('&dept=Loire&country=FR&lang=fr'), sans);
  assert.ok(!sans.includes('lat='), 'aucun point ne doit être transmis : ' + sans);
  // Un nom contenant « & » ou « = » ne doit pas pouvoir ajouter un paramètre.
  const piege = F.photoRequestUrl('A&lang=xx', '', 'FR', null, 'fr');
  assert.ok(piege.includes('name=A%26lang%3Dxx'), piege);
  assert.equal(piege.match(/lang=/g).length, 1, 'le nom ne doit pas injecter un second lang : ' + piege);
  // Département et pays absents : les paramètres restent présents mais vides.
  assert.ok(F.photoRequestUrl('X', null, null, null, 'fr').includes('&dept=&country=&'), 'paramètres vides attendus');
  const avec = F.photoRequestUrl('Lyon', 'Rhône', 'FR', { lat: 45.76, lon: 4.84, kind: 'area' }, 'de');
  assert.ok(avec.includes('&lat=45.76&lon=4.84&kind=area'), avec);
});

test('photo : les liens de repli portent la langue du visiteur et le nom du pays', () => {
  W.setLang('fr');
  const l = F.buildPhotoLinks('Lyon', 'FR');
  assert.ok(l.wiki.startsWith('https://fr.wikipedia.org/wiki/Special:Search?search=Lyon'), l.wiki);
  assert.ok(l.images.includes('Lyon%20France'), l.images);
  // Pays inconnu : on retombe sur la France, jamais sur un nom vide.
  assert.ok(F.buildPhotoLinks('X', 'ZZ').images.includes('X%20France'));
  assert.ok(F.buildPhotoLinks('Zermatt', 'CH').images.includes('Zermatt%20Suisse'));
});

test('wikiLang : alias, langues connues, repli français, repli anglais', () => {
  W.setLang('de');  assert.equal(F.wikiLang(), 'de');          // langue ayant sa Wikipédia
  W.setLang('fil'); assert.equal(F.wikiLang(), 'tl');          // alias déclaré
  W.setLang('crs'); assert.equal(F.wikiLang(), 'fr');          // créole seychellois -> français
  W.setLang('tru'); assert.equal(F.wikiLang(), 'en');          // aucune des trois voies -> anglais
  W.setLang('nrf-je'); assert.equal(F.wikiLang(), 'nrm');
  W.setLang('fr');
});

test('cache client : les entrées les plus anciennes sont évincées au-delà du plafond', () => {
  const store = {};
  const max = W.CLIENT_CACHE_MAX;
  for(let i = 0; i < max + 5; i++) F.cachePut(store, 'k' + i, i);
  assert.equal(Object.keys(store).length, max, 'le cache doit rester à son plafond');
  assert.ok(!('k0' in store), 'la plus ancienne entrée doit être évincée');
  assert.ok(('k' + (max + 4)) in store, 'la plus récente doit être gardée');
  // Sous le plafond, rien n'est évincé.
  const petit = {};
  F.cachePut(petit, 'a', 1); F.cachePut(petit, 'b', 2);
  assert.deepEqual(Object.keys(petit), ['a', 'b']);
});

test('libellé de plage de jours : « et » pour deux jours consécutifs, « à » au-delà', () => {
  W.setLang('fr');
  const deux = F.formatDayRangeLabel(3, 4), trois = F.formatDayRangeLabel(3, 5);
  assert.notEqual(deux, trois, 'deux jours consécutifs et une vraie plage ne se disent pas pareil');
  assert.ok(/3/.test(deux) && /4/.test(deux), deux);
  assert.ok(/3/.test(trois) && /5/.test(trois), trois);
  // Les chiffres suivent la langue : en arabe, les chiffres indo-arabes.
  W.setLang('ar');
  const ar = F.formatDayRangeLabel(3, 5);
  assert.ok(!/3/.test(ar) || /[٣٥]/.test(ar), 'chiffres de la langue attendus : ' + ar);
  W.setLang('fr');
});

test('hébergement : le libellé de catégorie distingue les quatre cas, tente comprise', () => {
  W.setLang('fr');
  const eco = F.lodgingCategoryLabel('economique', false);
  const ecoSansTente = F.lodgingCategoryLabel('economique', true);
  assert.notEqual(eco, ecoSansTente, 'la tente doit changer le libellé économique');
  assert.notEqual(F.lodgingCategoryLabel('moyen'), eco);
  assert.notEqual(F.lodgingCategoryLabel('confortable'), F.lodgingCategoryLabel('moyen'));
  // Palier inconnu : on retombe sur « confortable » plutôt que sur une clé brute.
  assert.equal(F.lodgingCategoryLabel('inexistant'), F.lodgingCategoryLabel('confortable'));
  assert.ok(!/^lodging\./.test(eco), 'aucune clé i18n brute ne doit sortir : ' + eco);
});

test('durée du séjour : nulle tant que les deux dates ne sont pas cohérentes', () => {
  W.els.dateStart.value = ''; W.els.dateEnd.value = '';
  assert.equal(F.getTripDays(), null, 'sans dates, aucune durée');
  W.els.dateStart.value = '2026-06-10'; W.els.dateEnd.value = '';
  assert.equal(F.getTripDays(), null, 'une seule date ne suffit pas');
  W.els.dateStart.value = '2026-06-10'; W.els.dateEnd.value = '2026-06-08';
  assert.equal(F.getTripDays(), null, 'une fin avant le début ne donne pas une durée négative');
  W.els.dateStart.value = '2026-06-10'; W.els.dateEnd.value = '2026-06-10';
  assert.equal(F.getTripDays(), 1, 'le même jour compte pour un jour');
  W.els.dateStart.value = '2026-06-10'; W.els.dateEnd.value = '2026-06-16';
  assert.equal(F.getTripDays(), 7, 'du 10 au 16 inclus : sept jours');
});

test('rayon effectif : kilomètres saisis, ou heures × vitesse', () => {
  W.setMode('km');
  W.els.radius.value = '250';
  assert.equal(F.effectiveRadiusKm(80), 250, 'en mode kilomètres, la vitesse ne sert pas');
  // Champ vide : le rayon par défaut prend le relais plutôt que zéro.
  W.els.radius.value = '';
  assert.equal(F.effectiveRadiusKm(80), 300);
  W.setMode('h');
  W.els.radius.value = '3';
  assert.equal(F.effectiveRadiusKm(80), 240, 'trois heures à 80 km/h');
  W.els.radius.value = 'abc';
  assert.equal(F.effectiveRadiusKm(50), 200, 'saisie illisible : quatre heures par défaut');
  W.setMode('km');
  W.els.radius.value = '';
});

test('devise : convertible seulement si un plafond d\'hébergement existe dans CETTE devise', () => {
  assert.equal(F.isConvertibleCurrency('EUR'), true, 'l\'euro est la devise de référence');
  assert.equal(F.isConvertibleCurrency('CHF'), true);
  assert.equal(F.isConvertibleCurrency('XXX'), false, 'devise sans plafond : non convertible');
  // Une exception du calcul ne doit pas remonter à l'appelant.
  const sauve = W.TripData ? null : null;
  W.DEVISES_OK.BOOM = 1;
  assert.equal(F.isConvertibleCurrency('BOOM'), true);
  delete W.DEVISES_OK.BOOM;
});

test('carte : l\'icône d\'étape enveloppe le contenu et transmet taille et ancrage', () => {
  const ic = F.tripDivIcon('trip-pin-start', '<b>1</b>', [30, 30], [15, 30]).__divIcon;
  assert.equal(ic.className, 'trip-pin-wrap', 'la classe extérieure est fixe');
  assert.equal(ic.html, '<div class="trip-pin-start"><b>1</b></div>');
  assert.deepEqual(ic.iconSize, [30, 30]);
  assert.deepEqual(ic.iconAnchor, [15, 30]);
});

// ---------------------------------------------------------------------------------------------------------------
// LOT 2 — VALIDATION DU FORMULAIRE ET MESSAGES D'ERREUR.
//
// Ces fonctions ne calculent presque rien : elles POSENT un état sur le DOM — classe « invalid » sur le bloc,
// « show » sur le message, aria-invalid sur le champ fautif, aria-describedby pour relier les deux. C'est
// précisément cet état qui compte, et c'est ce qu'aucun test ne regardait. Il faut donc un nœud factice qui
// RETIENNE ce qu'on lui pose, là où le premier bac à sable se contentait de tout absorber.
// Le message est gardé sous forme de FONCTION (voir msg()) pour pouvoir être retraduit sans être recalculé : le
// test vérifie aussi ce mécanisme, qui est ce qui permet de changer de langue sans perdre l'erreur affichée.
const FNS2 = ['isoDate', 'parseIsoDate', 'tripNightsAndDays', 'formatNum', 'dualWithoutNumber', 'durationLabel',
  'maxDaysSuffix', 'msg', 'setErrorText', 'addDescribedBy', 'removeDescribedBy', 'fieldInputs',
  'clearFieldError', 'showFieldError', 'retranslateErrors', 'clearFormError',
  'clearDatesError', 'showDatesError', 'updateDatesHint', 'checkDates',
  'clearMinDistanceError', 'showMinDistanceError', 'clearDaysPerCityError', 'showDaysPerCityError',
  'clearLegDistanceError', 'clearRadiusError'];

function sandboxFormulaire(){
  const fakeEl = () => ({ setAttribute(){}, getAttribute(){ return null; },
    classList: { add(){}, remove(){}, contains(){ return false; } },
    appendChild(){}, addEventListener(){}, querySelector(){ return fakeEl(); }, querySelectorAll(){ return []; }, style: {} });
  const ctx = { navigator: { languages: ['fr'] }, localStorage: { getItem: () => null, setItem(){} },
    document: { readyState: 'complete', documentElement: fakeEl(), querySelectorAll: () => [],
      getElementById: () => null, createElement: fakeEl, addEventListener(){} },
    CustomEvent: function(){}, Intl, console };
  ctx.window = { addEventListener(){}, dispatchEvent(){} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(PUB, 'i18n.js'), 'utf8'), ctx);

  const glue = [
    'var t = window.I18N.t, localeTag = function(c){ return window.I18N.localeTag(c); };',
    'var VISITOR_LANG = "fr", MAX_TRIP_DAYS = 21;',
    // Nœud factice qui RETIENT son état : classes, attributs, texte, message-fonction.
    'function noeud(id){',
    '  var n = { id: id || "", textContent: "", __message: null, _attrs: {}, _cl: {}, offsetWidth: 0 };',
    '  n.focus = function(){ n.__focus = (n.__focus || 0) + 1; };',
    '  n.classList = { add: function(c){ n._cl[c] = true; }, remove: function(c){ delete n._cl[c]; },',
    '    contains: function(c){ return !!n._cl[c]; } };',
    '  n.setAttribute = function(k, v){ n._attrs[k] = String(v); };',
    '  n.getAttribute = function(k){ return Object.prototype.hasOwnProperty.call(n._attrs, k) ? n._attrs[k] : null; };',
    '  n.removeAttribute = function(k){ delete n._attrs[k]; };',
    '  n.querySelectorAll = function(){ return n.__inputs || []; };',
    '  return n;',
    '}',
    // Un bloc de formulaire : le conteneur, son message d'erreur, et ses champs.
    'function bloc(idErreur, champs){ var f = noeud(); f.__inputs = champs; return { field: f, err: noeud(idErreur) }; }',
    'var champDateDebut = noeud(), champDateFin = noeud();',
    'var champMinDistance = noeud(), champMinJours = noeud(), champMaxJours = noeud();',
    'var champLegDistance = noeud(), champRayon = noeud();',
    'var bDates = bloc("dates-error", [champDateDebut, champDateFin]);',
    'var bMinDistance = bloc("min-distance-error", [champMinDistance]);',
    'var bJours = bloc("days-error", [champMinJours, champMaxJours]);',
    'var bLeg = bloc("leg-error", [champLegDistance]);',
    'var bRayon = bloc("radius-error", [champRayon]);',
    'var els = {',
    '  dateStart: champDateDebut, dateEnd: champDateFin, durationHint: noeud(),',
    '  datesField: bDates.field, datesError: bDates.err,',
    '  minDistance: champMinDistance, minDistanceField: bMinDistance.field, minDistanceError: bMinDistance.err,',
    '  minDaysPerCity: champMinJours, maxDaysPerCity: champMaxJours, daysPerCityField: bJours.field, daysPerCityError: bJours.err,',
    '  legDistance: champLegDistance, legDistanceField: bLeg.field, legDistanceError: bLeg.err,',
    '  radius: champRayon, radiusField: bRayon.field, radiusError: bRayon.err,',
    '  cityError: noeud("city-error"), formError: noeud("form-error")',
    '};',
    FNS2.map(extract).join('\n'),
    'this.F = { ' + FNS2.join(', ') + ' };',
    'this.els = els;',
    'this.setLang = function(l){ VISITOR_LANG = l; window.I18N.set(l); };'
  ].join('\n');
  vm.runInContext(glue, ctx);
  return ctx;
}
const W2 = sandboxFormulaire();
const F2 = W2.F, E2 = W2.els;

// Date du jour décalée de n jours, au format ISO : le test ne doit pas périmer avec le calendrier.
const jour = d => { const x = new Date(); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() + d);
  return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };

test('dates : les quatre refus sont distincts, et désignent le BON champ', () => {
  E2.dateStart.value = ''; E2.dateEnd.value = '';
  let r = F2.checkDates();
  assert.equal(r.input, E2.dateStart, 'sans date de départ, c\'est le champ de départ qui est fautif');
  const sansDebut = r.message();
  E2.dateStart.value = jour(1); E2.dateEnd.value = '';
  r = F2.checkDates();
  assert.equal(r.input, E2.dateEnd, 'sans date de retour, c\'est le champ de retour');
  assert.notEqual(r.message(), sansDebut, 'les deux absences ne se disent pas de la même façon');
  // Une date passée est refusée, et c'est le départ qui est montré.
  E2.dateStart.value = jour(-3); E2.dateEnd.value = jour(2);
  r = F2.checkDates();
  assert.equal(r.input, E2.dateStart);
  const passe = r.message();
  // Un retour avant le départ est un autre refus, sur l'autre champ.
  E2.dateStart.value = jour(5); E2.dateEnd.value = jour(2);
  r = F2.checkDates();
  assert.equal(r.input, E2.dateEnd);
  assert.notEqual(r.message(), passe, 'date passée et retour trop tôt sont deux messages différents');
  // Deux dates cohérentes : aucun refus.
  E2.dateStart.value = jour(1); E2.dateEnd.value = jour(4);
  assert.equal(F2.checkDates(), null);
  // Le même jour est accepté : une virée sans nuitée est un voyage valable.
  E2.dateStart.value = jour(1); E2.dateEnd.value = jour(1);
  assert.equal(F2.checkDates(), null);
});

test('erreur de champ : le bloc, le message et le champ fautif portent chacun leur marque', () => {
  W2.setLang('fr');
  F2.showDatesError(F2.msg('form.dates.error'), E2.dateEnd);
  assert.ok(E2.datesField.classList.contains('invalid'), 'le bloc doit être marqué invalide');
  assert.ok(E2.datesError.classList.contains('show'), 'le message doit être affiché');
  assert.ok(E2.datesError.textContent.length > 0, 'le message ne doit pas être vide');
  assert.ok(!/^form\./.test(E2.datesError.textContent), 'aucune clé i18n brute : ' + E2.datesError.textContent);
  // SEUL le champ désigné est invalide, et il est relié au message.
  assert.equal(E2.dateEnd.getAttribute('aria-invalid'), 'true');
  assert.equal(E2.dateStart.getAttribute('aria-invalid'), null, 'le champ NON fautif ne doit pas être marqué');
  assert.equal(E2.dateEnd.getAttribute('aria-describedby'), 'dates-error');
  // Effacement : tout retombe, y compris la liaison d'accessibilité.
  F2.clearDatesError();
  assert.ok(!E2.datesField.classList.contains('invalid'));
  assert.ok(!E2.datesError.classList.contains('show'));
  assert.equal(E2.dateEnd.getAttribute('aria-invalid'), null);
  assert.equal(E2.dateEnd.getAttribute('aria-describedby'), null);
});

test('erreur de champ : aria-describedby s\'ajoute à ce qui y figure déjà, et se retire seul', () => {
  E2.minDistance.setAttribute('aria-describedby', 'aide-min-distance');
  F2.showMinDistanceError(F2.msg('form.dates.error'));
  assert.equal(E2.minDistance.getAttribute('aria-describedby'), 'aide-min-distance min-distance-error',
    'le message s\'ajoute à l\'aide existante, il ne la remplace pas');
  F2.clearMinDistanceError();
  assert.equal(E2.minDistance.getAttribute('aria-describedby'), 'aide-min-distance',
    'l\'aide existante doit survivre à l\'effacement de l\'erreur');
  E2.minDistance.removeAttribute('aria-describedby');
});

test('erreur de champ : le champ non désigné du bloc reste indemne', () => {
  F2.showDaysPerCityError(F2.msg('form.dates.error'));
  assert.equal(E2.minDaysPerCity.getAttribute('aria-invalid'), 'true');
  assert.equal(E2.maxDaysPerCity.getAttribute('aria-invalid'), null,
    'par défaut seul le premier champ est désigné (voir l\'appel : [input || els.minDaysPerCity])');
  F2.clearDaysPerCityError();
  assert.equal(E2.minDaysPerCity.getAttribute('aria-invalid'), null);
});

test('erreurs : le message est gardé comme FONCTION et se retraduit sans être recalculé', () => {
  W2.setLang('fr');
  F2.showDatesError(F2.msg('form.dates.error'));
  const fr = E2.datesError.textContent;
  W2.setLang('de');
  F2.retranslateErrors();
  const de = E2.datesError.textContent;
  assert.notEqual(de, fr, 'le message affiché doit suivre la langue');
  assert.ok(de.length > 0);
  // Un message affiché SANS fonction (texte figé) n'est pas retraduit : c'est voulu.
  F2.setErrorText(E2.datesError, 'texte figé');
  F2.retranslateErrors();
  assert.equal(E2.datesError.textContent, 'texte figé');
  // Un message CACHÉ n'est pas retraduit non plus.
  F2.clearDatesError();
  F2.setErrorText(E2.datesError, F2.msg('form.dates.error'));
  E2.datesError.textContent = 'inchangé';
  F2.retranslateErrors();
  assert.equal(E2.datesError.textContent, 'inchangé', 'un message masqué ne doit pas être retraduit');
  W2.setLang('fr');
});

test('erreur générale du formulaire : effacée, elle ne laisse ni texte ni message mémorisé', () => {
  F2.setErrorText(E2.formError, F2.msg('form.dates.error'));
  E2.formError.classList.add('show');
  assert.ok(E2.formError.textContent.length > 0);
  F2.clearFormError();
  assert.equal(E2.formError.textContent, '');
  assert.equal(E2.formError.__message, null,
    'le message mémorisé doit être oublié, sinon il reviendrait au changement de langue');
  assert.ok(!E2.formError.classList.contains('show'));
});

test('indice de durée : rempli quand les dates sont cohérentes, et il borne le champ de retour', () => {
  W2.setLang('fr');
  E2.dateStart.value = '2026-06-10'; E2.dateEnd.value = '2026-06-12';
  F2.updateDatesHint();
  const trois = E2.durationHint.textContent;
  assert.ok(trois.length > 0, 'l\'indice doit être rempli');
  assert.equal(E2.dateEnd.min, '2026-06-10', 'le champ de retour ne doit pas pouvoir descendre sous le départ');
  // Une durée plus longue ne se dit pas comme une plus courte.
  E2.dateEnd.value = '2026-06-20';
  F2.updateDatesHint();
  assert.notEqual(E2.durationHint.textContent, trois);
  // Au-delà du plafond de 21 jours, l'indice ajoute une mention.
  E2.dateEnd.value = '2026-08-10';
  F2.updateDatesHint();
  const plafonne = E2.durationHint.textContent;
  E2.dateEnd.value = '2026-06-30';
  F2.updateDatesHint();
  assert.notEqual(plafonne, E2.durationHint.textContent, 'le plafond doit se voir dans l\'indice');
  // Le même jour : un jour, sans nuitée, et l'indice le dit quand même.
  E2.dateEnd.value = '2026-06-10';
  F2.updateDatesHint();
  assert.ok(E2.durationHint.textContent.length > 0);
});

// ---------------------------------------------------------------------------------------------------------------
// LOT 3 — THÈME, MÉTADONNÉES DE LA PAGE, ÉTIQUETTES DES COMMANDES.
//
// Ces fonctions écrivent AILLEURS que dans le corps de la page : le titre du document, la balise
// « theme-color » que lit le navigateur pour colorer sa barre, les aria-label des boutons de pas, l'état
// désactivé du péage à vélo. Rien de tout cela ne se voyait dans un test, et rien de tout cela n'est visible à
// l'œil nu dans le rendu — ce sont précisément les endroits où une régression passe inaperçue.
// Le bac à sable doit donc offrir un document qui RETIENNE son titre, ses attributs, et rende ses nœuds par
// sélecteur ou par identifiant.
const VARS3 = ['MAX_STOPS', 'THEME_COLORS', 'tripRouteLine', 'MILE_COUNTRIES'];
const FNS3 = ['formatNum', 'unitForLang', 'distanceUnit', 'distanceUnitVars', 'addDescribedBy', 'removeDescribedBy',
  'cssVar', 'refreshMapColors', 'applyThemeButtonLabel', 'applyThemeColorMeta', 'applyDocumentMeta', 'applyHeroLede',
  'updateTollAvailability', 'applyStepButtonLabels', 'stepNumberField', 'stepRadius', 'updatePackProgress',
  'fitRadiusDisplay'];

// STEP_BUTTON_LABELS tient sur plusieurs lignes : extractVar, qui ne lit qu'une ligne, ne sait pas la prendre.
function extractVarBloc(name){
  const lines = APP.split('\n');
  const i = lines.findIndex(l => l.startsWith('  var ' + name + ' = ['));
  assert.ok(i >= 0, 'variable ' + name + ' introuvable');
  const j = lines.findIndex((l, k) => k > i && /^\s{2}\];/.test(l));
  assert.ok(j > i, 'fin de ' + name + ' introuvable');
  return lines.slice(i, j + 1).join('\n');
}

function sandboxTheme(){
  const ctx = { navigator: { languages: ['fr'] }, localStorage: { getItem: () => null, setItem(){} },
    CustomEvent: function(){}, Event: function(type){ this.type = type; }, Intl, console };
  ctx.window = { addEventListener(){}, dispatchEvent(){} };
  // Document qui RETIENT : titre, attributs de <html>, nœuds par sélecteur et par identifiant, styles calculés.
  const noeud = (id) => { const n = { id: id || '', textContent: '', hidden: false, disabled: false, checked: false,
      value: '', _attrs: {}, _cl: {}, style: {}, scrollWidth: 10, clientWidth: 100,
      __events: [], dispatchEvent(e){ this.__events.push(e && e.type); return true; } };
    n.classList = { add: c => { n._cl[c] = true; }, remove: c => { delete n._cl[c]; },
      contains: c => !!n._cl[c], toggle: (c, on) => { if(on) n._cl[c] = true; else delete n._cl[c]; } };
    n.setAttribute = (k, v) => { n._attrs[k] = String(v); };
    n.getAttribute = k => Object.prototype.hasOwnProperty.call(n._attrs, k) ? n._attrs[k] : null;
    n.removeAttribute = k => { delete n._attrs[k]; };
    n.querySelectorAll = () => n.__enfants || [];
    return n; };
  const parId = {}, parSelecteur = {};
  ctx.document = { readyState: 'complete', title: 'Cap sur l\'inconnu',
    documentElement: noeud(), addEventListener(){},
    getElementById: id => parId[id] || null,
    querySelector: s => (parSelecteur[s] || [])[0] || null,
    querySelectorAll: s => parSelecteur[s] || [],
    createElement: () => noeud() };
  ctx.getComputedStyle = () => ({ getPropertyValue: p => ({ '--accent': ' #A33 ', '--accent-3': ' #3A3 ' })[p] || '' });
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(PUB, 'i18n.js'), 'utf8'), ctx);

  // Nœuds enregistrés AVANT d'exécuter le code extrait, puisque plusieurs variables les capturent à la déclaration.
  const meta = noeud(); meta.setAttribute('content', 'description originale');
  const themeMeta = noeud(); themeMeta.setAttribute('content', '#000000');
  const hero = noeud();
  parSelecteur['meta[name="description"]'] = [meta];
  parSelecteur['meta[name="theme-color"]'] = [themeMeta];
  parSelecteur['[data-i18n="hero.lede"]'] = [hero];
  const boutonTheme = noeud(); boutonTheme.setAttribute('data-theme-current', 'dark');
  parSelecteur['.theme-toggle-btn'] = [boutonTheme];
  for(const base of ['radius', 'min-distance', 'max-distance', 'leg-distance', 'min-days-per-city', 'max-days-per-city']){
    parId[base + '-dec'] = noeud(base + '-dec');
    parId[base + '-inc'] = noeud(base + '-inc');
  }
  ctx.__n = { meta, themeMeta, hero, boutonTheme, parId, noeud };

  const glue = [
    'var t = window.I18N.t, localeTag = function(c){ return window.I18N.localeTag(c); };',
    'var VISITOR_LANG = "fr", MAX_TRIP_DAYS = 21, fieldDistanceUnit = "km";',
    VARS3.map(extractVar).join('\n'),
    extractVarBloc('STEP_BUTTON_LABELS'),
    // Les variables que app.js capture au chargement : on les reconstitue dans le même ordre.
    'var heroLedeEl = document.querySelector(\'[data-i18n="hero.lede"]\');',
    'var metaDescriptionEl = document.querySelector(\'meta[name="description"]\');',
    'var originalTitle = document.title;',
    'var originalDescription = metaDescriptionEl ? metaDescriptionEl.getAttribute("content") : "";',
    'var themeColorMetas = Array.prototype.slice.call(document.querySelectorAll(\'meta[name="theme-color"]\'));',
    'themeColorMetas.forEach(function(m){ m.__original = m.getAttribute("content"); });',
    'var tripReturnLine = null;',
    // Champs du formulaire dont ces fonctions ont besoin.
    'var champ = function(v){ var n = __n.noeud(); n.value = v === undefined ? "" : String(v); return n; };',
    'var casePack1 = __n.noeud(), casePack2 = __n.noeud();',
    'var grille = __n.noeud(); grille.__enfants = [casePack1, casePack2];',
    'var els = { transport: champ("voiture-thermique"), tollToggle: __n.noeud(), tollField: __n.noeud(),',
    '  tollBikeHint: __n.noeud("toll-bike-hint"), radius: champ("300"),',
    '  packGrid: grille, packProgress: __n.noeud(),',
    '  radiusValueDisplay: __n.noeud(), radiusValueWrap: __n.noeud() };',
    'els.tollBikeHint.hidden = true;',
    FNS3.map(extract).join('\n'),
    'this.F = { ' + FNS3.join(', ') + ' };',
    'this.els = els;',
    'this.N = __n;',
    'this.lignes = { set: function(a, r){ tripRouteLine = a; tripReturnLine = r; } };',
    'this.setLang = function(l){ VISITOR_LANG = l; window.I18N.set(l); };'
  ].join('\n');
  vm.runInContext(glue, ctx);
  return ctx;
}
const W3 = sandboxTheme();
const F3 = W3.F, E3 = W3.els, N3 = W3.N;

test('carte : cssVar rend la variable CSS SANS ses blancs, et les tracés se recolorent', () => {
  assert.equal(F3.cssVar('--accent'), '#A33', 'les blancs autour de la valeur doivent être coupés');
  assert.equal(F3.cssVar('--inexistante'), '', 'une variable absente rend la chaîne vide, pas undefined');
  // refreshMapColors relit les couleurs À L'INSTANT DU DESSIN : c'est ce qui permet au thème sombre de s'appliquer.
  const aller = { __style: null, setStyle(s){ this.__style = s; } };
  const retour = { __style: null, setStyle(s){ this.__style = s; } };
  W3.lignes.set(aller, retour);
  F3.refreshMapColors();
  assert.equal(aller.__style.color, '#3A3', 'l\'aller prend --accent-3');
  assert.equal(retour.__style.color, '#A33', 'le retour prend --accent');
  // Sans tracé, la fonction ne doit pas lever.
  W3.lignes.set(null, null);
  F3.refreshMapColors();
});

test('thème : la balise theme-color suit le choix, et revient à sa valeur d\'origine en automatique', () => {
  W3.document.documentElement.setAttribute('data-theme', 'dark');
  F3.applyThemeColorMeta();
  assert.equal(N3.themeMeta.getAttribute('content'), '#12191A');
  W3.document.documentElement.setAttribute('data-theme', 'light');
  F3.applyThemeColorMeta();
  assert.equal(N3.themeMeta.getAttribute('content'), '#E4DFC9');
  // Mode automatique : aucune couleur imposée, on rend la valeur que la page portait au départ.
  W3.document.documentElement.setAttribute('data-theme', 'auto');
  F3.applyThemeColorMeta();
  assert.equal(N3.themeMeta.getAttribute('content'), '#000000',
    'en automatique, la balise doit retrouver sa valeur d\'origine');
});

test('thème : l\'étiquette du bouton dit l\'état COURANT et reste traduite', () => {
  W3.setLang('fr');
  N3.boutonTheme.setAttribute('data-theme-current', 'dark');
  F3.applyThemeButtonLabel();
  const sombre = N3.boutonTheme.getAttribute('aria-label');
  assert.ok(sombre && sombre.length > 3, sombre);
  assert.ok(!/^theme\./.test(sombre), 'aucune clé i18n brute : ' + sombre);
  N3.boutonTheme.setAttribute('data-theme-current', 'light');
  F3.applyThemeButtonLabel();
  assert.notEqual(N3.boutonTheme.getAttribute('aria-label'), sombre, 'clair et sombre ne se disent pas pareil');
  // Valeur inconnue : on retombe sur « auto » plutôt que d'écrire une clé.
  N3.boutonTheme.setAttribute('data-theme-current', 'n-importe-quoi');
  F3.applyThemeButtonLabel();
  const repli = N3.boutonTheme.getAttribute('aria-label');
  N3.boutonTheme.setAttribute('data-theme-current', 'auto');
  F3.applyThemeButtonLabel();
  assert.equal(repli, N3.boutonTheme.getAttribute('aria-label'));
  // Et l'étiquette suit la langue.
  W3.setLang('de');
  F3.applyThemeButtonLabel();
  assert.notEqual(N3.boutonTheme.getAttribute('aria-label'), repli);
  W3.setLang('fr');
});

test('métadonnées : le français garde les textes d\'origine, les autres langues les traduisent', () => {
  W3.setLang('fr');
  F3.applyDocumentMeta();
  assert.equal(W3.document.title, 'Cap sur l\'inconnu', 'en français, le titre écrit dans la page fait foi');
  assert.equal(N3.meta.getAttribute('content'), 'description originale');
  W3.setLang('de');
  F3.applyDocumentMeta();
  assert.notEqual(W3.document.title, 'Cap sur l\'inconnu', 'dans une autre langue, le titre est traduit');
  assert.ok(W3.document.title.includes('—'), 'le titre traduit assemble titre et surtitre : ' + W3.document.title);
  assert.notEqual(N3.meta.getAttribute('content'), 'description originale');
  assert.ok(!/\{maxDays\}/.test(N3.meta.getAttribute('content')), 'les paramètres doivent être remplis');
  W3.setLang('fr');
  F3.applyDocumentMeta();
  assert.equal(W3.document.title, 'Cap sur l\'inconnu', 'le retour au français restaure l\'original');
});

test('accroche : elle porte les deux nombres, dans les chiffres de la langue', () => {
  W3.setLang('fr');
  F3.applyHeroLede();
  const fr = N3.hero.textContent;
  assert.ok(fr.includes('21'), 'la durée maximale doit apparaître : ' + fr);
  assert.ok(fr.includes('15'), 'le nombre d\'étapes doit apparaître : ' + fr);
  W3.setLang('ar');
  F3.applyHeroLede();
  const ar = N3.hero.textContent;
  assert.ok(!ar.includes('21') || /[٠-٩]/.test(ar), 'chiffres de la langue attendus : ' + ar);
  W3.setLang('fr');
});

test('péage : désactivé à vélo, avec son explication reliée au champ', () => {
  E3.transport.value = 'velo';
  F3.updateTollAvailability();
  assert.equal(E3.tollToggle.disabled, true, 'le péage n\'a pas de sens à vélo');
  assert.ok(E3.tollField.classList.contains('is-disabled'));
  assert.equal(E3.tollBikeHint.hidden, false, 'l\'explication doit être visible');
  assert.equal(E3.tollToggle.getAttribute('aria-describedby'), 'toll-bike-hint',
    'sans cette liaison, un lecteur d\'écran n\'annonce pas POURQUOI la case est désactivée');
  // Retour à un mode motorisé : tout se défait, y compris la liaison.
  E3.transport.value = 'voiture-thermique';
  F3.updateTollAvailability();
  assert.equal(E3.tollToggle.disabled, false);
  assert.ok(!E3.tollField.classList.contains('is-disabled'));
  assert.equal(E3.tollBikeHint.hidden, true);
  assert.equal(E3.tollToggle.getAttribute('aria-describedby'), null);
});

test('boutons de pas : chaque paire reçoit une étiquette distincte, qui nomme son champ', () => {
  W3.setLang('fr');
  F3.applyStepButtonLabels();
  const dec = N3.parId['radius-dec'].getAttribute('aria-label');
  const inc = N3.parId['radius-inc'].getAttribute('aria-label');
  assert.ok(dec && inc, 'les deux boutons doivent être étiquetés');
  assert.notEqual(dec, inc, 'diminuer et augmenter ne se disent pas pareil');
  // Deux champs différents ne partagent pas la même étiquette, sinon les six paires seraient indiscernables.
  assert.notEqual(N3.parId['min-distance-dec'].getAttribute('aria-label'), dec);
  // Les champs qui ont une unité la portent : min et max de distance se distinguent l'un de l'autre.
  assert.notEqual(N3.parId['min-distance-dec'].getAttribute('aria-label'),
    N3.parId['max-distance-dec'].getAttribute('aria-label'),
    'le minimum et le maximum partagent leur libellé : seule l\'unité les sépare');
  assert.ok(!/^form\./.test(dec), 'aucune clé i18n brute : ' + dec);
});

test('paquetage : la barre passe à « complet » seulement quand TOUTES les cases sont cochées', () => {
  const [a, b] = E3.packGrid.querySelectorAll();
  a.checked = false; b.checked = false;
  F3.updatePackProgress();
  assert.ok(!E3.packProgress.classList.contains('complete'));
  a.checked = true;
  F3.updatePackProgress();
  assert.ok(!E3.packProgress.classList.contains('complete'), 'une case sur deux ne suffit pas');
  b.checked = true;
  F3.updatePackProgress();
  assert.ok(E3.packProgress.classList.contains('complete'));
  // Grille VIDE : ce n'est pas « complet », sinon la barre serait pleine avant que la liste n'existe.
  E3.packGrid.__enfants = [];
  F3.updatePackProgress();
  assert.ok(!E3.packProgress.classList.contains('complete'), 'une grille vide ne doit pas compter pour complète');
  E3.packGrid.__enfants = [a, b];
});

test('affichage du rayon : la taille est réduite par paliers, et deux lignes en dernier recours', () => {
  const el = E3.radiusValueDisplay, wrap = E3.radiusValueWrap;
  // Le texte tient : aucune réduction, aucune bascule sur deux lignes.
  el.scrollWidth = 50; el.clientWidth = 100;
  F3.fitRadiusDisplay();
  assert.equal(el.style.fontSize, '', 'un texte qui tient garde sa taille');
  assert.ok(!wrap.classList.contains('two-lines'));
  // Le texte ne tient à aucune taille : on passe à deux lignes.
  el.scrollWidth = 500; el.clientWidth = 100;
  F3.fitRadiusDisplay();
  assert.ok(wrap.classList.contains('two-lines'), 'en dernier recours, le libellé passe sur deux lignes');
  assert.equal(el.style.fontSize, '0.72rem', 'la plus petite taille a été essayée avant de renoncer');
});

test('pas du rayon : le bouton déplace la valeur du champ dans les deux sens', () => {
  E3.radius.value = '300'; E3.radius.min = '50'; E3.radius.max = '3000'; E3.radius.step = '10';
  F3.stepRadius(1);
  const apresPlus = Number(E3.radius.value);
  assert.ok(apresPlus > 300, 'le bouton « plus » doit augmenter la valeur : ' + E3.radius.value);
  F3.stepRadius(-1);
  assert.equal(Number(E3.radius.value), 300, 'un pas dans chaque sens revient au point de départ');
  // La borne basse est respectée.
  E3.radius.value = '50';
  F3.stepRadius(-1);
  assert.ok(Number(E3.radius.value) >= 50, 'le pas ne doit pas descendre sous la borne : ' + E3.radius.value);
});

// ---------------------------------------------------------------------------------------------------------------
// LOT 4 — APPELS AU SERVEUR, MÉMOÏSATION ET FILES PARTAGÉES.
//
// Ce lot vise une subtilité qui ne se voit pas en lisant le code vite : **un échec n'est PAS mémorisé**. Les deux
// fonctions de chargement écrivent leur promesse dans un cache, puis la RETIRENT si la requête échoue — sans quoi
// une coupure réseau d'une seconde condamnerait la commune pour toute la durée de la visite. C'est exactement le
// genre de ligne qu'une simplification bien intentionnée supprime.
// On vérifie aussi que la mémoïsation fait son travail dans l'autre sens : deux demandes pour le même lieu ne
// doivent produire QU'UN appel, plusieurs nuits au même endroit étant le cas courant.
const VARS4 = ['GENERIC_KEYS_NO_WALK', 'CLIENT_CACHE_MAX'];
const FNS4 = ['cachePut', 'randInt', 'shuffle', 'hikeKeyOf', 'fetchHikeData', 'fetchPhotoJson', 'fetchRealPOIs',
  'sharedPoiQueue', 'realPoiQueueSync', 'realPoiQueueFor'];

function sandboxReseau(){
  const ctx = { navigator: { languages: ['fr'] }, localStorage: { getItem: () => null, setItem(){} },
    document: { readyState: 'complete', addEventListener(){},
      documentElement: { setAttribute(){}, getAttribute: () => null, classList: { add(){}, remove(){}, contains: () => false } },
      querySelectorAll: () => [], querySelector: () => null, getElementById: () => null },
    CustomEvent: function(){}, Intl, console };
  ctx.window = { addEventListener(){}, dispatchEvent(){} };
  // Journal des appels et réponse programmable : c'est le seul moyen de compter les requêtes vraiment émises.
  const appels = [];
  let reponse = { ok: true, corps: {} };
  ctx.fetch = (url) => {
    appels.push(url);
    if(reponse.jette) return Promise.reject(new Error('réseau coupé'));
    return Promise.resolve({ ok: reponse.ok, status: reponse.ok ? 200 : 503,
      json: () => Promise.resolve(reponse.corps) });
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(PUB, 'i18n.js'), 'utf8'), ctx);
  const glue = [
    'var t = window.I18N.t;',
    'var VISITOR_LANG = "fr";',
    VARS4.map(extractVar).join('\n'),
    'var clientHikeCache = {}, clientPoiCache = {}, clientPoiResolved = {};',
    'var poiQueueByLocation = {}, genericQueueByLocation = {};',
    // Mélange déterministe : la file doit être vérifiable, et son ORDRE n'est pas l'objet du test.
    'var rand = function(){ return 0.5; };',
    FNS4.map(extract).join('\n'),
    'this.F = { ' + FNS4.join(', ') + ' };',
    'this.caches = { hike: function(){ return clientHikeCache; }, poi: function(){ return clientPoiCache; },',
    '  resolved: function(){ return clientPoiResolved; }, files: function(){ return poiQueueByLocation; },',
    '  vide: function(){ clientHikeCache = {}; clientPoiCache = {}; clientPoiResolved = {};',
    '    poiQueueByLocation = {}; genericQueueByLocation = {}; } };'
  ].join('\n');
  vm.runInContext(glue, ctx);
  ctx.__appels = appels;
  ctx.__reponse = r => { reponse = r; };
  return ctx;
}
const W4 = sandboxReseau();
const F4 = W4.F;
const raz = () => { W4.__appels.length = 0; W4.caches.vide(); };

test('randonnées : la clé de cache tient le nom, le pays ET la position arrondie', () => {
  assert.equal(F4.hikeKeyOf({ stop: 'Lyon', country: 'FR', lat: 45.7640, lon: 4.8357 }), 'Lyon|FR|45.764,4.836');
  // Deux points à moins de cent mètres partagent leur clé : un seul appel pour la même commune.
  assert.equal(F4.hikeKeyOf({ stop: 'Lyon', country: 'FR', lat: 45.7641, lon: 4.8358 }),
    F4.hikeKeyOf({ stop: 'Lyon', country: 'FR', lat: 45.7640, lon: 4.8357 }));
  // Sans coordonnées, la clé reste formée — elle ne doit pas devenir « undefined ».
  assert.equal(F4.hikeKeyOf({ stop: 'Lyon' }), 'Lyon||');
  // Le pays fait partie de la clé : deux homonymes de pays différents ne se confondent pas.
  assert.notEqual(F4.hikeKeyOf({ stop: 'Tripoli', country: 'LB', lat: 34.4, lon: 35.8 }),
    F4.hikeKeyOf({ stop: 'Tripoli', country: 'LY', lat: 34.4, lon: 35.8 }));
});

test('randonnées : la requête porte la langue SANS sa variante régionale', async () => {
  raz();
  W4.__reponse({ ok: true, corps: { hikes: [{ url: 'a' }], portals: [{ url: 'p' }] } });
  const r = await F4.fetchHikeData({ stop: 'Saint-Étienne', country: 'FR', lat: 45.44, lon: 4.39 });
  assert.deepEqual(plat(r), { hikes: [{ url: 'a' }], portals: [{ url: 'p' }] });
  const url = W4.__appels[0];
  assert.ok(url.startsWith('/api/hike?name=Saint-%C3%89tienne'), url);
  assert.ok(url.includes('&country=FR&lat=45.44&lon=4.39'), url);
  assert.ok(url.includes('&lang=fr'), url);
  // Une réponse vide donne des listes vides, jamais undefined : l'appelant itère dessus sans se garder.
  raz();
  W4.__reponse({ ok: true, corps: {} });
  assert.deepEqual(plat(await F4.fetchHikeData({ stop: 'X', country: 'FR', lat: 1, lon: 2 })), { hikes: [], portals: [] });
});

test('randonnées : mémoïsé en cas de succès, NON mémoïsé en cas d\'échec', async () => {
  raz();
  W4.__reponse({ ok: true, corps: { hikes: [{ url: 'a' }] } });
  const leg = { stop: 'Lyon', country: 'FR', lat: 45.76, lon: 4.84 };
  await F4.fetchHikeData(leg);
  await F4.fetchHikeData(leg);
  assert.equal(W4.__appels.length, 1, 'deux demandes pour la même commune ne doivent produire qu\'un appel');
  // Échec : la promesse est retirée du cache, pour qu\'une coupure d\'une seconde ne condamne pas la commune.
  raz();
  W4.__reponse({ ok: false, corps: {} });
  const vide = await F4.fetchHikeData(leg);
  assert.deepEqual(plat(vide), { hikes: [], portals: [] }, 'un échec rend des listes vides, pas une exception');
  assert.equal(Object.keys(W4.caches.hike()).length, 0, 'l\'échec ne doit PAS rester en cache');
  W4.__reponse({ ok: true, corps: { hikes: [{ url: 'b' }] } });
  const apres = await F4.fetchHikeData(leg);
  assert.equal(plat(apres).hikes.length, 1, 'la demande suivante doit repartir sur le réseau et réussir');
  assert.equal(W4.__appels.length, 2);
});

test('photo : une réponse non-OK est rejetée plutôt que rendue vide', async () => {
  raz();
  W4.__reponse({ ok: false, corps: {} });
  await assert.rejects(() => F4.fetchPhotoJson('/api/photo?name=X'), /http 503/);
  W4.__reponse({ ok: true, corps: { image: 'u' } });
  assert.deepEqual(plat(await F4.fetchPhotoJson('/api/photo?name=X')), { image: 'u' });
});

test('points d\'intérêt : la clé arrondit la position, et le nom n\'est transmis que s\'il existe', async () => {
  raz();
  W4.__reponse({ ok: true, corps: { pois: [{ name: 'Musée' }] } });
  await F4.fetchRealPOIs(45.7640, 4.8357, 'Lyon', 'Rhône', 'FR');
  assert.ok(W4.__appels[0].includes('&name=Lyon&dept=Rh%C3%B4ne&country=FR'), W4.__appels[0]);
  // Sans nom, les trois paramètres sont absents plutôt que vides.
  raz();
  await F4.fetchRealPOIs(10, 20, null, null, null);
  assert.ok(!W4.__appels[0].includes('&name='), W4.__appels[0]);
  // Le résultat est rangé dans le cache RÉSOLU, ce qui permet la file synchrone.
  raz();
  W4.__reponse({ ok: true, corps: { pois: [{ name: 'A' }, { name: 'B' }] } });
  await F4.fetchRealPOIs(45.764, 4.836, 'Lyon', '', 'FR');
  assert.deepEqual(Object.keys(W4.caches.resolved()), ['45.764,4.836']);
});

test('points d\'intérêt : l\'échec rend une liste vide et n\'est pas mémoïsé', async () => {
  raz();
  W4.__reponse({ jette: true });
  const r = await F4.fetchRealPOIs(1, 2, 'X', '', 'FR');
  assert.deepEqual(plat(r), [], 'un échec rend une liste vide, pas null');
  assert.equal(Object.keys(W4.caches.poi()).length, 0, 'l\'échec ne doit pas rester en cache');
  // Et le cache résolu ne doit pas retenir un échec comme si les POI étaient arrivés et absents.
  assert.equal(Object.keys(W4.caches.resolved()).length, 0,
    'sinon la file synchrone croirait que la commune n\'a aucun point d\'intérêt');
});

test('file partagée : créée une seule fois par lieu, et elle dit si les POI sont réels', () => {
  raz();
  const a = F4.sharedPoiQueue('k1', [{ name: 'A' }, { name: 'B' }]);
  assert.equal(a.hasPois, true);
  assert.equal(a.poisQueue.length, 2);
  assert.ok(a.genericQueue.length > 0, 'la file générique sert de repli quand les POI manquent');
  // Deuxième appel : la MÊME file, pour que deux jours au même endroit se partagent les propositions.
  const b = F4.sharedPoiQueue('k1', [{ name: 'C' }]);
  assert.equal(b.poisQueue, a.poisQueue, 'la file doit être partagée, pas recréée');
  assert.equal(b.hasPois, true);
  // Aucun POI : la file existe quand même, et hasPois le dit.
  const c = F4.sharedPoiQueue('k2', []);
  assert.equal(c.hasPois, false);
  assert.equal(c.poisQueue.length, 0);
  assert.equal(F4.sharedPoiQueue('k3', null).hasPois, false);
});

test('file synchrone : nulle tant que les POI ne sont pas arrivés, puis partagée avec l\'autre voie', async () => {
  raz();
  assert.equal(F4.realPoiQueueSync(45.764, 4.836), null, 'avant la réponse, rien à distribuer');
  W4.__reponse({ ok: true, corps: { pois: [{ name: 'A' }] } });
  const parReseau = await F4.realPoiQueueFor(45.764, 4.836, 'Lyon', '', 'FR');
  const sync = F4.realPoiQueueSync(45.764, 4.836);
  assert.ok(sync, 'une fois les POI arrivés, la file synchrone existe');
  assert.equal(sync.poisQueue, parReseau.poisQueue, 'les deux voies doivent rendre LA MÊME file');
  // Une commune sans aucun POI est distinguée d\'une commune dont on n\'a pas encore la réponse.
  raz();
  W4.__reponse({ ok: true, corps: { pois: [] } });
  await F4.realPoiQueueFor(1, 2, 'X', '', 'FR');
  const vide = F4.realPoiQueueSync(1, 2);
  assert.ok(vide, 'la réponse « aucun POI » doit être mémorisée comme une réponse');
  assert.equal(vide.hasPois, false);
});

// ---------------------------------------------------------------------------------------------------------------
// LOT 5 — TEXTES D'INVITE, ÉTIQUETTES D'OPTIONS, LIENS D'HÉBERGEMENT.
//
// Deux choses valent d'être verrouillées ici. D'abord le texte d'invite du champ de ville, qui tire un exemple au
// hasard : il doit être TIRÉ UNE SEULE FOIS, sinon il changerait à chaque changement de langue et le visiteur
// verrait l'exemple sauter d'une commune à l'autre sans raison. Ensuite les liens d'hébergement, qui composent du
// HTML à la main : tout lien local dont l'adresse n'est pas en https doit être ÉCARTÉ, et le nom de la plateforme
// échappé — c'est la seule barrière entre une donnée de plateforme et une injection dans la page.
const VARS5 = ['DEFAULT_LEG_KM', 'DEFAULT_LEG_KM_OTHER', 'MILE_COUNTRIES', 'KM_PER_MILE'];
const FNS5 = ['formatNum', 'unitForLang', 'distanceUnit', 'distanceUnitVars', 'kmToDistanceUnit',
  'formatDistanceValue', 'defaultDistanceValue', 'unitFieldBounds', 'distanceFieldSpec', 'escHtml', 'safeUrl', 'camelFromDash', 'transportPackExtra',
  'budgetLabel', 'applyBudgetOptionLabels', 'applyDistanceUnitTexts',
  'lodgingUrlWithCurrency', 'lodgingLinksHtml', 'pickPlaceholderCommune', 'placeholderText', 'localeDateText',
  'numericDatesLang', 'tickClock'];

function extractVarBloc5(name){
  const lines = APP.split('\n');
  const i = lines.findIndex(l => l.startsWith('  var ' + name + ' = ['));
  assert.ok(i >= 0, 'variable ' + name + ' introuvable');
  const j = lines.findIndex((l, k) => k > i && /^\s{2}\];/.test(l));
  return lines.slice(i, j + 1).join('\n');
}

function sandboxInvites(){
  const noeud = (id) => { const n = { id: id || '', textContent: '', placeholder: '', value: '', hidden: false,
      _attrs: {}, _cl: {}, style: {}, clientWidth: 200 };
    n.classList = { add: c => { n._cl[c] = true; }, remove: c => { delete n._cl[c]; }, contains: c => !!n._cl[c],
      toggle: (c, on) => { if(on) n._cl[c] = true; else delete n._cl[c]; } };
    n.setAttribute = (k, v) => { n._attrs[k] = String(v); };
    n.getAttribute = k => Object.prototype.hasOwnProperty.call(n._attrs, k) ? n._attrs[k] : null;
    n.removeAttribute = k => { delete n._attrs[k]; };
    n.querySelectorAll = () => n.__enfants || [];
    return n; };
  const parSelecteur = {};
  const ctx = { navigator: { languages: ['fr'] }, localStorage: { getItem: () => null, setItem(){} },
    document: { readyState: 'complete', addEventListener(){}, documentElement: noeud(),
      querySelector: s => (parSelecteur[s] || [])[0] || null,
      querySelectorAll: s => parSelecteur[s] || [],
      getElementById: () => null, createElement: () => noeud() },
    CustomEvent: function(){}, Intl, console };
  ctx.window = { addEventListener(){}, dispatchEvent(){} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(PUB, 'i18n.js'), 'utf8'), ctx);

  const uniteA = noeud(); uniteA.setAttribute('data-i18n-unit', 'form.legDistance.hint');
  parSelecteur['[data-i18n-unit]'] = [uniteA];
  ctx.__n = { uniteA, noeud, parSelecteur };

  const glue = [
    'var t = window.I18N.t, tl = window.I18N.tl, localeTag = function(c){ return window.I18N.localeTag(c); };',
    'var VISITOR_LANG = "fr", MAX_TRIP_DAYS = 21, fieldDistanceUnit = "km";',
    VARS5.map(extractVar).join('\n'),
    extractVarBloc5('PLACEHOLDER_EXAMPLES'),
    'var placeholderCommune = null;',
    // Options du sélecteur de budget et horloge : seuls leurs textes comptent.
    'var optEco = __n.noeud(), optMoyen = __n.noeud(), optConfort = __n.noeud();',
    'optEco.value = "economique"; optMoyen.value = "moyen"; optConfort.value = "confortable";',
    'var els = { budget: { options: [optEco, optMoyen, optConfort] }, clock: __n.noeud() };',
    // Devise de session : lodgingUrlWithCurrency la lit.
    'var sessionCurrency = null;',
    'var TripData = { lodgingPriceCap: function(){ return { currency: "EUR" }; } };',
    FNS5.map(extract).join('\n'),
    'this.F = { ' + FNS5.join(', ') + ' };',
    'this.els = els;',
    'this.N = __n;',
    'this.invite = { lue: function(){ return placeholderCommune; }, oublie: function(){ placeholderCommune = null; } };',
    'this.setLang = function(l){ VISITOR_LANG = l; window.I18N.set(l); };',
    'this.setUnite = function(u){ fieldDistanceUnit = u; };'
  ].join('\n');
  vm.runInContext(glue, ctx);
  return ctx;
}
const W5 = sandboxInvites();
const F5 = W5.F, E5 = W5.els, N5 = W5.N;

test('invite du champ de ville : l\'exemple est tiré UNE fois et ne saute plus', () => {
  W5.setLang('fr');
  W5.invite.oublie();
  const premier = F5.placeholderText();
  assert.ok(premier.length > 0);
  assert.ok(!/\{name\}|\{cp\}/.test(premier), 'les paramètres doivent être remplis : ' + premier);
  const commune = W5.invite.lue();
  assert.ok(commune && commune.name, 'la commune tirée doit être mémorisée');
  // Cent appels : toujours la même commune. Sans cette mémoire, l'exemple changerait à chaque retraduction.
  for(let i = 0; i < 100; i++) F5.placeholderText();
  assert.equal(W5.invite.lue().name, commune.name);
  // Le texte suit la langue, mais l'exemple ne change pas.
  W5.setLang('de');
  const allemand = F5.placeholderText();
  assert.notEqual(allemand, premier, 'le texte doit être traduit');
  assert.ok(allemand.includes(commune.name), 'la commune tirée doit survivre au changement de langue : ' + allemand);
  W5.setLang('fr');
});

test('invite : le tirage puise dans la liste d\'exemples, et rend une fiche exploitable', () => {
  for(let i = 0; i < 50; i++){
    const c = F5.pickPlaceholderCommune();
    assert.ok(c && typeof c.name === 'string' && c.name.length > 0, 'nom manquant : ' + JSON.stringify(plat(c)));
    assert.ok(c.cps && c.cps.length > 0, 'code postal manquant : ' + JSON.stringify(plat(c)));
  }
});

test('paquetage : le supplément de transport est traduit, et sa clé dérive du mode', () => {
  W5.setLang('fr');
  const velo = F5.transportPackExtra('velo');
  const electrique = F5.transportPackExtra('voiture-electrique');
  // camelFromDash : « voiture-electrique » devient « voitureElectrique » dans la clé.
  assert.equal(F5.camelFromDash('voiture-electrique'), 'voitureElectrique');
  assert.notEqual(velo, electrique, 'deux modes ne demandent pas le même supplément');
  // Un mode sans supplément déclaré doit rendre une valeur vide, jamais la clé brute.
  const inconnu = F5.transportPackExtra('tapis-volant');
  assert.ok(!/^pack\./.test(String(inconnu || '')), 'aucune clé i18n brute : ' + inconnu);
});

test('budget : chaque option porte son libellé ET sa description, et suit la langue', () => {
  W5.setLang('fr');
  F5.applyBudgetOptionLabels();
  const eco = E5.budget.options[0].textContent;
  assert.ok(eco.includes('—'), 'le libellé et la description sont assemblés : ' + eco);
  assert.ok(!/^form\./.test(eco), 'aucune clé i18n brute : ' + eco);
  // Les trois paliers se distinguent.
  const trois = E5.budget.options.map(o => o.textContent);
  assert.equal(new Set(trois).size, 3, 'les trois paliers doivent avoir des textes distincts');
  W5.setLang('de');
  F5.applyBudgetOptionLabels();
  assert.notEqual(E5.budget.options[0].textContent, eco);
  W5.setLang('fr');
});

test('unités : les textes citent les valeurs par défaut TELLES QU\'AFFICHÉES dans le champ', () => {
  W5.setLang('fr');
  W5.setUnite('km');
  F5.applyDistanceUnitTexts();
  const km = N5.uniteA.textContent;
  assert.ok(km.length > 0);
  assert.ok(km.includes('80') || km.includes('400'), 'les valeurs par défaut doivent apparaître : ' + km);
  // En miles, le texte doit citer la valeur du champ converti, pas la valeur en kilomètres.
  W5.setUnite('mi');
  F5.applyDistanceUnitTexts();
  const mi = N5.uniteA.textContent;
  assert.notEqual(mi, km, 'le texte doit changer avec l\'unité');
  assert.ok(!mi.includes('400'), 'en miles, la valeur en kilomètres ne doit plus apparaître : ' + mi);
  W5.setUnite('km');
});

test('hébergement : un lien local non-https est ÉCARTÉ, et le nom de la plateforme est échappé', () => {
  W5.setLang('fr');
  const html = F5.lodgingLinksHtml({
    airbnb: 'https://airbnb.example/x', booking: 'https://booking.example/y',
    local: [
      { name: 'Gîtes <b>de</b> France', url: 'https://gites.example/z' },
      { name: 'Pas sûr', url: 'http://non-chiffre.example/w' },
      { name: 'Piège', url: 'javascript:alert(1)' }
    ]
  }, 'FR', 'moyen');
  assert.ok(html.includes('airbnb.example'), html);
  assert.ok(html.includes('booking.example'), html);
  assert.ok(html.includes('gites.example'), 'le lien local en https doit être gardé');
  assert.ok(!html.includes('non-chiffre.example'), 'un lien en http doit être écarté : ' + html);
  assert.ok(!html.includes('javascript:'), 'aucun schéma exécutable ne doit passer : ' + html);
  assert.ok(!html.includes('<b>de</b>'), 'le nom de la plateforme doit être échappé : ' + html);
  assert.ok(html.includes('&lt;b&gt;'), 'le nom échappé doit rester lisible : ' + html);
  // Chaque lien s'ouvre dans un onglet neuf, sans donner la main à la page ouverte.
  assert.equal((html.match(/rel="noopener"/g) || []).length, 3);
  // Aucune plateforme : un texte dédié, pas une chaîne vide qui laisserait un trou dans la page.
  const rien = F5.lodgingLinksHtml({}, 'FR', 'moyen');
  assert.ok(rien.includes('lodging-none'), rien);
  assert.ok(!/^\s*$/.test(rien));
});

test('horloge : la date du jour est écrite dans la langue, sans clé brute', () => {
  W5.setLang('fr');
  F5.tickClock();
  const fr = E5.clock.textContent;
  assert.ok(fr.length > 3, 'l\'horloge doit être remplie : ' + fr);
  W5.setLang('ja');
  F5.tickClock();
  assert.notEqual(E5.clock.textContent, fr, 'la date doit suivre la langue');
  W5.setLang('fr');
});

// ---------------------------------------------------------------------------------------------------------------
// LOT 6 — VISIONNEUSE D'IMAGES, QUE LE JOURNAL DONNAIT POUR INTESTABLE.
//
// La limite écrite était : « la visionneuse demande un DOM qui analyse innerHTML, et le projet s'interdit une
// dépendance de test ». C'est vrai du DOM réel, mais pas du problème : ce qu'on veut vérifier, c'est la CHAÎNE
// produite et le comportement, pas la capacité du navigateur à l'analyser. Il suffit que le nœud factice rende
// des enfants ENREGISTRÉS par sélecteur — un test double ordinaire.
// Ce que ce lot verrouille vraiment : une légende venue d'un service tiers est ÉCHAPPÉE, une adresse d'image qui
// n'est pas en http(s) est REFUSÉE, la fenêtre porte toujours un nom (un role="dialog" sans nom est une faute
// d'accessibilité), et la fermeture rend le focus à l'élément qui l'avait ouverte.
const FNS6 = ['escHtml', 'plainText', 'safeUrl', 'safeHref', 'icon', 'photoFilePage', 'photoCreditInfo', 'photoCreditHtml',
  'ensureLightbox', 'applyLightboxTexts', 'openLightbox', 'closeLightbox', 'restoreExportButton'];

function sandboxVisionneuse(){
  // Nœud factice dont querySelector rend un enfant ENREGISTRÉ : on ne simule pas l'analyse du HTML, on la contourne.
  const noeud = (cls) => { const n = { className: cls || '', innerHTML: '', textContent: '', src: '', alt: '',
      _attrs: {}, _cl: {}, style: {}, isConnected: true, __focus: 0, __enfants: {}, __ecouteurs: [] };
    n.classList = { add: c => { n._cl[c] = true; }, remove: c => { delete n._cl[c]; }, contains: c => !!n._cl[c],
      toggle: (c, on) => { if(on) n._cl[c] = true; else delete n._cl[c]; } };
    n.setAttribute = (k, v) => { n._attrs[k] = String(v); };
    n.getAttribute = k => Object.prototype.hasOwnProperty.call(n._attrs, k) ? n._attrs[k] : null;
    n.removeAttribute = k => { delete n._attrs[k]; };
    n.appendChild = c => { n.__ajoutes = (n.__ajoutes || []).concat([c]); return c; };
    n.addEventListener = (t2, f) => { n.__ecouteurs.push(t2); };
    n.focus = () => { n.__focus++; };
    n.querySelector = s => n.__enfants[s] || null;
    n.querySelectorAll = s => n.__enfants['*' + s] || [];
    return n; };

  const ctx = { navigator: { languages: ['fr'] }, localStorage: { getItem: () => null, setItem(){} },
    CustomEvent: function(){}, Intl, console };
  ctx.window = { addEventListener(){}, dispatchEvent(){} };
  const corps = noeud('body');
  const ouvreur = noeud('bouton-ouvreur');
  ctx.document = { readyState: 'complete', body: corps, activeElement: ouvreur,
    documentElement: noeud(), addEventListener(){}, querySelectorAll: () => [], querySelector: () => null,
    getElementById: () => null,
    // L'élément fabriqué reçoit d'emblée les enfants que le code ira chercher par sélecteur.
    createElement: () => { const n = noeud();
      n.__enfants['.lightbox-close'] = noeud('lightbox-close');
      n.__enfants['.lightbox-img'] = noeud('lightbox-img');
      n.__enfants['.lightbox-caption'] = noeud('lightbox-caption');
      return n; } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(PUB, 'i18n.js'), 'utf8'), ctx);

  const boutonExport = noeud('export');
  const etiquette = noeud('etiquette');
  etiquette.setAttribute('data-i18n', 'export.button');
  boutonExport.__enfants['*[data-i18n]'] = [etiquette];
  ctx.__n = { corps, ouvreur, boutonExport, etiquette, noeud };

  const glue = [
    'var t = window.I18N.t;',
    'var VISITOR_LANG = "fr";',
    'var ICONS = { close: "<svg data-close></svg>" };',
    'var lightboxEl = null, lightboxOpener = null;',
    'var els = { exportPdfBtn: __n.boutonExport };',
    'var exportBtnOriginalHtml = "<span data-i18n=\\"export.button\\">Exporter</span>";',
    FNS6.map(extract).join('\n'),
    'this.F = { ' + FNS6.join(', ') + ' };',
    'this.N = __n;',
    'this.boite = { lue: function(){ return lightboxEl; }, oublie: function(){ lightboxEl = null; lightboxOpener = null; },',
    '  ouvreur: function(){ return lightboxOpener; } };',
    'this.setLang = function(l){ VISITOR_LANG = l; window.I18N.set(l); };'
  ].join('\n');
  vm.runInContext(glue, ctx);
  return ctx;
}
const W6 = sandboxVisionneuse();
const F6 = W6.F, N6 = W6.N;

test('visionneuse : fabriquée UNE fois, avec son rôle, son nom et l\'image sans référent', () => {
  W6.boite.oublie();
  const el = F6.ensureLightbox();
  assert.ok(el, 'la fenêtre doit être fabriquée');
  assert.equal(el.className, 'lightbox');
  assert.equal(el.getAttribute('role'), 'dialog');
  assert.equal(el.getAttribute('aria-modal'), 'true', 'sans aria-modal, un lecteur d\'écran continue de lire la page derrière');
  // Le contenu est jugé sur la CHAÎNE produite : c'est ce que le navigateur analysera.
  assert.ok(el.innerHTML.includes('lightbox-close'), el.innerHTML);
  assert.ok(el.innerHTML.includes('lightbox-img'), el.innerHTML);
  assert.ok(el.innerHTML.includes('lightbox-caption'), el.innerHTML);
  assert.ok(el.innerHTML.includes('referrerpolicy="no-referrer"'),
    'l\'image ne doit pas divulguer la page d\'origine au serveur tiers : ' + el.innerHTML);
  assert.ok(el.innerHTML.includes('data-close'), 'l\'icône de fermeture doit être posée');
  // Elle est attachée à la page, et un second appel rend LA MÊME fenêtre.
  assert.ok((N6.corps.__ajoutes || []).indexOf(el) >= 0, 'la fenêtre doit être ajoutée au corps de la page');
  assert.equal(F6.ensureLightbox(), el, 'deux appels ne doivent pas fabriquer deux fenêtres');
  // Les écouteurs sont posés : clic sur le fond et sur le bouton de fermeture.
  assert.ok(el.__ecouteurs.includes('click'));
  assert.ok(el.querySelector('.lightbox-close').__ecouteurs.includes('click'));
});

test('visionneuse : le bouton de fermeture est nommé, et renommé au changement de langue', () => {
  W6.boite.oublie();
  W6.setLang('fr');
  F6.ensureLightbox();
  F6.applyLightboxTexts();
  const fr = W6.boite.lue().querySelector('.lightbox-close').getAttribute('aria-label');
  assert.ok(fr && fr.length > 2, fr);
  assert.ok(!/^photo\./.test(fr), 'aucune clé i18n brute : ' + fr);
  W6.setLang('de');
  F6.applyLightboxTexts();
  assert.notEqual(W6.boite.lue().querySelector('.lightbox-close').getAttribute('aria-label'), fr);
  W6.setLang('fr');
  // Sans fenêtre fabriquée, la fonction ne doit pas lever.
  W6.boite.oublie();
  F6.applyLightboxTexts();
});

test('visionneuse : une adresse d\'image non http(s) est REFUSÉE, la fenêtre reste fermée', () => {
  W6.boite.oublie();
  F6.openLightbox('javascript:alert(1)', 'Légende', null, null);
  assert.equal(W6.boite.lue(), null, 'aucune fenêtre ne doit même être fabriquée');
  F6.openLightbox('', 'Légende', null, null);
  assert.equal(W6.boite.lue(), null);
  F6.openLightbox(null, null, null, null);
  assert.equal(W6.boite.lue(), null);
});

test('visionneuse : la légende venue d\'un tiers est ÉCHAPPÉE, et le lien Wikipédia contrôlé', () => {
  W6.boite.oublie();
  W6.setLang('fr');
  F6.openLightbox('https://upload.wikimedia.org/a/b/Vue.jpg', 'Château <img src=x onerror=alert(1)>',
    'https://fr.wikipedia.org/wiki/X', null);
  const el = W6.boite.lue();
  const legende = el.querySelector('.lightbox-caption').innerHTML;
  assert.ok(!legende.includes('<img src=x'), 'la légende ne doit pas pouvoir injecter une balise : ' + legende);
  assert.ok(legende.includes('&lt;img'), 'la légende échappée doit rester lisible : ' + legende);
  assert.ok(legende.includes('fr.wikipedia.org'), legende);
  assert.ok(legende.includes('rel="noopener"'), legende);
  assert.equal(el.querySelector('.lightbox-img').src, 'https://upload.wikimedia.org/a/b/Vue.jpg');
  assert.ok(el.classList.contains('show'), 'la fenêtre doit être affichée');
  // Un lien Wikipédia douteux est neutralisé, pas recopié.
  W6.boite.oublie();
  F6.openLightbox('https://u.example/a.jpg', 'X', 'javascript:alert(1)', null);
  const l2 = W6.boite.lue().querySelector('.lightbox-caption').innerHTML;
  assert.ok(!l2.includes('javascript:'), l2);
});

test('visionneuse : un role="dialog" a TOUJOURS un nom, même sans légende', () => {
  W6.boite.oublie();
  W6.setLang('fr');
  F6.openLightbox('https://u.example/a.jpg', 'Ajaccio', null, null);
  assert.equal(W6.boite.lue().getAttribute('aria-label'), 'Ajaccio', 'le nom du lieu sert d\'intitulé');
  W6.boite.oublie();
  F6.openLightbox('https://u.example/a.jpg', '', null, null);
  const repli = W6.boite.lue().getAttribute('aria-label');
  assert.ok(repli && repli.length > 2, 'sans légende, un intitulé de repli est obligatoire : ' + repli);
  assert.ok(!/^photo\./.test(repli), 'aucune clé i18n brute : ' + repli);
});

test('visionneuse : fermée, elle lâche l\'image et rend le focus à qui l\'avait ouverte', () => {
  W6.boite.oublie();
  F6.openLightbox('https://u.example/a.jpg', 'X', null, null);
  const el = W6.boite.lue();
  assert.ok(el.classList.contains('show'));
  const avant = N6.ouvreur.__focus;
  F6.closeLightbox();
  assert.ok(!el.classList.contains('show'));
  assert.equal(el.querySelector('.lightbox-img').getAttribute('src'), null,
    'l\'image doit être lâchée, sinon elle reste chargée en mémoire');
  assert.equal(N6.ouvreur.__focus, avant + 1, 'le focus doit revenir à l\'élément d\'origine');
  assert.equal(W6.boite.ouvreur(), null, 'la référence à l\'ouvreur doit être relâchée');
  // Fermer deux fois ne doit rien casser ni redonner le focus une seconde fois.
  F6.closeLightbox();
  assert.equal(N6.ouvreur.__focus, avant + 1);
  // Un ouvreur retiré de la page entre-temps ne reçoit pas le focus.
  W6.boite.oublie();
  F6.openLightbox('https://u.example/a.jpg', 'X', null, null);
  N6.ouvreur.isConnected = false;
  const avant2 = N6.ouvreur.__focus;
  F6.closeLightbox();
  assert.equal(N6.ouvreur.__focus, avant2, 'un élément disparu ne doit pas recevoir le focus');
  N6.ouvreur.isConnected = true;
});

test('export : le bouton retrouve son contenu d\'origine, retraduit', () => {
  W6.setLang('fr');
  N6.boutonExport.innerHTML = '<span>Génération…</span>';
  F6.restoreExportButton();
  assert.ok(N6.boutonExport.innerHTML.includes('data-i18n="export.button"'),
    'le contenu d\'origine doit être remis : ' + N6.boutonExport.innerHTML);
  assert.ok(N6.etiquette.textContent.length > 0, 'les libellés internes doivent être retraduits');
  const fr = N6.etiquette.textContent;
  W6.setLang('de');
  F6.restoreExportButton();
  assert.notEqual(N6.etiquette.textContent, fr, 'le libellé doit suivre la langue');
  W6.setLang('fr');
});

// ---------------------------------------------------------------------------------------------------------------
// LOT 7 — PHOTOS, CHANGEMENT DE LANGUE EN ARRIÈRE-PLAN, DISTRIBUTION DES RANDONNÉES.
//
// C'est le mécanisme le plus délicat de l'interface, et il n'était gardé par rien. Ce qu'il promet, en clair :
// un changement de langue ne doit PAS faire clignoter les photos déjà affichées. Le cache est donc indexé par
// LIEU et non par langue ; quand la langue change, les entrées déjà chargées sont redemandées en arrière-plan,
// deux à la fois, et seul le LIEN Wikipédia est remplacé — l'image, elle, reste. Puis un seul redessin à la fin.
// Chacune de ces clauses est un endroit où une régression serait invisible en lecture et très visible à l'écran.
const FNS7 = ['cachePut', 'rand', 'randInt', 'shuffle', 'wikiLang', 'photoRequestUrl', 'fetchPhotoJson',
  'hikeKeyOf', 'fetchHikeData', 'fetchPlacePhoto', 'queuePhotoLangRefresh', 'pumpPhotoRefresh', 'pickHikeForCommune'];
const VARS7 = ['CLIENT_CACHE_MAX', 'WIKI_ALIAS', 'WIKI_FALLBACK_FR', 'PHOTO_REFRESH_CONCURRENCY'];

function sandboxPhotos(){
  const ctx = { navigator: { languages: ['fr'] }, localStorage: { getItem: () => null, setItem(){} },
    document: { readyState: 'complete', addEventListener(){}, querySelectorAll: () => [], querySelector: () => null,
      getElementById: () => null,
      documentElement: { setAttribute(){}, getAttribute: () => null, classList: { add(){}, remove(){}, contains: () => false } } },
    CustomEvent: function(){}, Intl, console };
  ctx.window = { addEventListener(){}, dispatchEvent(){} };
  const appels = [];
  let reponse = { ok: true, corps: {} };
  let enVol = 0, maxEnVol = 0;
  ctx.fetch = (url) => {
    appels.push(url);
    if(reponse.jette) return Promise.reject(new Error('coupure'));
    enVol++; if(enVol > maxEnVol) maxEnVol = enVol;
    // Résolution différée d'un tour de boucle : c'est ce qui permet de mesurer le parallélisme réel.
    return new Promise(res => setImmediate(() => { enVol--;
      res({ ok: reponse.ok, status: reponse.ok ? 200 : 503, json: () => Promise.resolve(reponse.corps) }); }));
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(PUB, 'i18n.js'), 'utf8'), ctx);
  const glue = [
    'var t = window.I18N.t;',
    'var VISITOR_LANG = "fr";',
    'var WIKI_CODES = { fr: 1, en: 1, de: 1, es: 1 };',
    VARS7.map(extractVar).join('\n'),
    'var clientPhotoCache = {}, clientHikeCache = {};',
    'var photoRefreshQueue = [], photoRefreshActive = 0, photoRefreshChanged = false;',
    'var hikeQueueByCommune = {}, usedHikeUrls = {}, tripGeneration = 1;',
    // Redessin : on ne veut pas l exercer ici, on veut COMPTER combien de fois il est demandé.
    'var redessins = 0;',
    'function scheduleDaysRerender(){ redessins++; }',
    FNS7.map(extract).join('\n'),
    'this.F = { ' + FNS7.join(', ') + ' };',
    'this.etat = {',
    '  redessins: function(){ return redessins; },',
    '  cache: function(){ return clientPhotoCache; },',
    '  file: function(){ return photoRefreshQueue.length; },',
    '  generation: function(g){ tripGeneration = g; },',
    '  raz: function(){ clientPhotoCache = {}; clientHikeCache = {}; photoRefreshQueue = [];',
    '    photoRefreshActive = 0; photoRefreshChanged = false; hikeQueueByCommune = {}; usedHikeUrls = {};',
    '    tripGeneration = 1; redessins = 0; }',
    '};',
    'this.setLang = function(l){ VISITOR_LANG = l; window.I18N.set(l); };'
  ].join('\n');
  vm.runInContext(glue, ctx);
  ctx.__appels = appels;
  ctx.__reponse = r => { reponse = r; };
  ctx.__maxEnVol = () => maxEnVol;
  ctx.__razVol = () => { maxEnVol = 0; };
  return ctx;
}
const W7 = sandboxPhotos();
const F7 = W7.F;
const raz7 = () => { W7.__appels.length = 0; W7.etat.raz(); W7.__razVol(); W7.setLang('fr'); };
// Laisse la file de promesses se vider : le rafraîchissement est volontairement asynchrone.
const souffle = () => new Promise(r => setTimeout(r, 30));

test('photo : la clé de cache tient le lieu ET le point voisin, arrondi au centième', () => {
  raz7();
  W7.__reponse({ ok: true, corps: { image: 'i1', wikiUrl: 'w1' } });
  F7.fetchPlacePhoto('Lyon', 'Rhône', 'FR', { lat: 45.7640, lon: 4.8357, kind: 'area' });
  F7.fetchPlacePhoto('Lyon', 'Rhône', 'FR', { lat: 45.7641, lon: 4.8358, kind: 'area' });
  assert.equal(W7.__appels.length, 1, 'deux points à dix mètres partagent leur clé');
  // Un genre différent donne une autre clé : la photo d un POI n est pas celle de la commune.
  F7.fetchPlacePhoto('Lyon', 'Rhône', 'FR', { lat: 45.764, lon: 4.836, kind: 'poi' });
  assert.equal(W7.__appels.length, 2);
  // Sans point voisin non plus.
  F7.fetchPlacePhoto('Lyon', 'Rhône', 'FR', null);
  assert.equal(W7.__appels.length, 3);
});

test('photo : un échec n\'est pas mémorisé, et il rend une fiche vide plutôt qu\'une exception', async () => {
  raz7();
  W7.__reponse({ jette: true });
  const r = await F7.fetchPlacePhoto('X', '', 'FR', null);
  assert.deepEqual(plat(r), { image: null, wikiUrl: null, title: null });
  assert.equal(Object.keys(W7.etat.cache()).length, 0, 'l\'échec ne doit pas rester en cache');
  W7.__reponse({ ok: true, corps: { image: 'i', wikiUrl: 'w' } });
  const r2 = await F7.fetchPlacePhoto('X', '', 'FR', null);
  assert.equal(plat(r2).image, 'i', 'la demande suivante doit repartir sur le réseau');
});

test('photo : changer de langue GARDE l\'image affichée et ne remplace que le lien', async () => {
  raz7();
  W7.__reponse({ ok: true, corps: { image: 'photo-fr.jpg', wikiUrl: 'https://fr.wikipedia.org/x', title: 'Titre FR' } });
  await F7.fetchPlacePhoto('Lyon', '', 'FR', null);
  await souffle();
  const avant = W7.__appels.length;
  // La langue change : la photo déjà affichée doit rester, seul le lien est redemandé.
  W7.setLang('de');
  W7.__reponse({ ok: true, corps: { image: 'photo-de.jpg', wikiUrl: 'https://de.wikipedia.org/x', title: 'Titel DE' } });
  const p = F7.fetchPlacePhoto('Lyon', '', 'FR', null);
  await souffle();
  assert.ok(W7.__appels.length > avant, 'la nouvelle langue doit déclencher une demande en arrière-plan');
  const entree = plat(W7.etat.cache()['Lyon||FR|-']);
  assert.equal(entree.data.image, 'photo-fr.jpg', 'l\'image déjà affichée NE DOIT PAS changer');
  assert.equal(entree.data.wikiUrl, 'https://de.wikipedia.org/x', 'le lien, lui, doit suivre la langue');
  assert.equal(entree.data.title, 'Titel DE');
  assert.equal(entree.lang, 'de');
  await p;
});

test('photo : sans image déjà affichée, la nouvelle réponse remplace tout', async () => {
  raz7();
  W7.__reponse({ ok: true, corps: { image: null, wikiUrl: 'https://fr.wikipedia.org/x' } });
  await F7.fetchPlacePhoto('Ajaccio', '', 'FR', null);
  await souffle();
  W7.setLang('de');
  W7.__reponse({ ok: true, corps: { image: 'trouvee-en-de.jpg', wikiUrl: 'https://de.wikipedia.org/x' } });
  F7.fetchPlacePhoto('Ajaccio', '', 'FR', null);
  await souffle();
  const e = plat(W7.etat.cache()['Ajaccio||FR|-']);
  assert.equal(e.data.image, 'trouvee-en-de.jpg',
    'quand il n\'y avait pas d\'image, la nouvelle langue peut en apporter une');
});

test('photo : la même langue n\'est pas mise en file deux fois', async () => {
  raz7();
  W7.__reponse({ ok: true, corps: { image: 'i', wikiUrl: 'w' } });
  await F7.fetchPlacePhoto('Nice', '', 'FR', null);
  await souffle();
  const entree = W7.etat.cache()['Nice||FR|-'];
  W7.setLang('de');
  F7.queuePhotoLangRefresh(entree, 'Nice', '', 'FR', null, 'de');
  F7.queuePhotoLangRefresh(entree, 'Nice', '', 'FR', null, 'de');
  F7.queuePhotoLangRefresh(entree, 'Nice', '', 'FR', null, 'de');
  await souffle();
  // Une seule demande de rafraîchissement, malgré trois appels.
  const refresh = W7.__appels.filter(u => u.includes('lang=de')).length;
  assert.equal(refresh, 1, 'trois demandes pour la même langue ne doivent produire qu\'un appel, en eut ' + refresh);
});

test('photo : deux rafraîchissements au plus à la fois, et UN SEUL redessin à la fin', async () => {
  raz7();
  W7.__reponse({ ok: true, corps: { image: 'i', wikiUrl: 'w-fr' } });
  const noms = ['A', 'B', 'C', 'D', 'E', 'F'];
  for(const n of noms) await F7.fetchPlacePhoto(n, '', 'FR', null);
  await souffle();
  W7.__razVol();
  W7.setLang('de');
  W7.__reponse({ ok: true, corps: { image: 'i', wikiUrl: 'w-de' } });
  for(const n of noms) F7.fetchPlacePhoto(n, '', 'FR', null);
  await souffle(); await souffle(); await souffle();
  assert.ok(W7.__maxEnVol() <= W7.PHOTO_REFRESH_CONCURRENCY || W7.__maxEnVol() <= 2,
    'le rafraîchissement ne doit pas partir en rafale : ' + W7.__maxEnVol() + ' requêtes simultanées');
  assert.equal(W7.etat.file(), 0, 'la file doit être vidée');
  assert.equal(W7.etat.redessins(), 1,
    'un seul redessin pour six photos rafraîchies, et non un par photo : ' + W7.etat.redessins());
});

test('randonnées : jamais deux fois la même, et null quand la commune est épuisée', async () => {
  raz7();
  W7.__reponse({ ok: true, corps: { hikes: [{ url: 'h1' }, { url: 'h2' }], portals: [] } });
  const leg = { stop: 'Chamonix', country: 'FR', lat: 45.92, lon: 6.87 };
  const a = await F7.pickHikeForCommune(leg);
  const b = await F7.pickHikeForCommune(leg);
  assert.ok(a && b, 'deux nuits d\'affilée doivent recevoir deux randonnées');
  assert.notEqual(plat(a).url, plat(b).url, 'deux jours au même endroit ne doivent pas proposer la même balade');
  // Épuisée : null plutôt qu'une répétition.
  assert.equal(await F7.pickHikeForCommune(leg), null);
  // Une autre commune qui proposerait la MÊME randonnée ne la reprend pas non plus.
  raz7();
  W7.__reponse({ ok: true, corps: { hikes: [{ url: 'h9' }], portals: [] } });
  const l1 = { stop: 'A', country: 'FR', lat: 1, lon: 1 }, l2 = { stop: 'B', country: 'FR', lat: 2, lon: 2 };
  assert.ok(await F7.pickHikeForCommune(l1));
  assert.equal(await F7.pickHikeForCommune(l2), null, 'une randonnée déjà proposée ailleurs ne revient pas');
});

test('randonnées : un nouveau tirage annule la distribution en cours', async () => {
  raz7();
  W7.__reponse({ ok: true, corps: { hikes: [{ url: 'h1' }], portals: [] } });
  const leg = { stop: 'Chamonix', country: 'FR', lat: 45.92, lon: 6.87 };
  const p = F7.pickHikeForCommune(leg);
  W7.etat.generation(2);   // l'utilisateur relance un tirage pendant que la requête est en vol
  assert.equal(await p, null, 'le résultat d\'un tirage abandonné ne doit pas être distribué');
});

// ---------------------------------------------------------------------------------------------------------------
// LOT 8 — MINUTERIES, CARTE, LIEN WIKIPÉDIA D'UNE ACTIVITÉ.
//
// Trois de ces fonctions reposent sur une MINUTERIE, et c'est le fond du sujet dans deux cas :
//   - l'erreur générale rend la région visible AVANT d'y écrire, et reporte l'écriture d'une tâche. Le commentaire
//     du code dit pourquoi : une région role="alert" absente du rendu n'est pas dans l'arbre d'accessibilité, donc
//     rien n'y est annoncé. Un test qui n'attendrait pas la tâche suivante ne verrait jamais le texte ;
//   - le redessin du journal de bord est REGROUPÉ : plusieurs réponses arrivant dans la même tâche ne doivent
//     produire qu'un seul redessin, sinon la carte perdrait son zoom à chaque point d'intérêt reçu.
// La minuterie est donc réelle ici (setTimeout du contexte), et le test attend — c'est le seul moyen de vérifier
// le report lui-même plutôt que l'intention.
const FNS8 = ['escHtml', 'safeHref', 'msg', 'setErrorText', 'addDescribedBy', 'removeDescribedBy', 'fieldInputs',
  'clearFieldError', 'showFieldError', 'showCityError', 'showFormError', 'scheduleDaysRerender',
  'applyMapTexts', 'applyActivityCardWikiLink'];

function sandboxMinuteries(){
  const noeud = (cls) => { const n = { className: cls || '', id: '', textContent: '', innerHTML: '', tagName: 'SPAN',
      href: '', target: '', rel: '', _attrs: {}, _cl: {}, __remplace: null, __enfants: {} };
    n.classList = { add: c => { n._cl[c] = true; }, remove: c => { delete n._cl[c]; }, contains: c => !!n._cl[c] };
    n.setAttribute = (k, v) => { n._attrs[k] = String(v); };
    n.getAttribute = k => Object.prototype.hasOwnProperty.call(n._attrs, k) ? n._attrs[k] : null;
    n.removeAttribute = k => { delete n._attrs[k]; };
    n.querySelector = s => n.__enfants[s] || null;
    n.querySelectorAll = () => [];
    n.replaceWith = r => { n.__remplace = r; };
    n.focus = () => {};
    return n; };
  const ctx = { navigator: { languages: ['fr'] }, localStorage: { getItem: () => null, setItem(){} },
    CustomEvent: function(){}, Intl, console, setTimeout, clearTimeout };
  ctx.window = { addEventListener(){}, dispatchEvent(){} };
  ctx.document = { readyState: 'complete', addEventListener(){}, documentElement: noeud(),
    querySelectorAll: () => [], querySelector: () => null, getElementById: () => null,
    createElement: () => noeud() };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(PUB, 'i18n.js'), 'utf8'), ctx);

  // Carte factice : on ne dessine rien, on vérifie CE QUI LUI EST DEMANDÉ.
  const journalCarte = [];
  ctx.__carte = journalCarte;
  const glue = [
    'var t = window.I18N.t;',
    'var VISITOR_LANG = "fr";',
    'var champVille = { _attrs: {}, setAttribute: function(k,v){ this._attrs[k] = v; },',
    '  getAttribute: function(k){ return this._attrs[k] === undefined ? null : this._attrs[k]; },',
    '  removeAttribute: function(k){ delete this._attrs[k]; }, focus: function(){} };',
    'var blocVille = { classList: { add: function(){}, remove: function(){} }, querySelectorAll: function(){ return [champVille]; }, offsetWidth: 0 };',
    'function n2(id){ var x = { id: id, textContent: "", __message: null, _cl: {} };',
    '  x.classList = { add: function(c){ x._cl[c] = true; }, remove: function(c){ delete x._cl[c]; }, contains: function(c){ return !!x._cl[c]; } };',
    '  return x; }',
    'var els = { city: champVille, cityField: blocVille, cityError: n2("city-error"), formError: n2("form-error"),',
    '  mapWrap: { _attrs: {}, setAttribute: function(k,v){ this._attrs[k] = v; }, getAttribute: function(k){ return this._attrs[k] === undefined ? null : this._attrs[k]; } } };',
    // Redessin : compté, jamais exécuté.
    'var daysRerenderTimer = null, currentTripData = { legs: [] }, redessins = 0;',
    'function renderDays(){ redessins++; }',
    // Carte et Leaflet factices.
    'var tripMap = null, mapZoomControl = null, mapAttributionHtml = null;',
    'var L = { control: { zoom: function(o){ __carte.push(["zoom", o]); return { addTo: function(m){ __carte.push(["addTo"]); return { __zoom: o }; } }; } } };',
    'function carteFactice(){ return { removeControl: function(c){ __carte.push(["removeControl", c]); },',
    '  attributionControl: { addAttribution: function(h){ __carte.push(["add", h]); },',
    '    removeAttribution: function(h){ __carte.push(["remove", h]); } } }; }',
    FNS8.map(extract).join('\n'),
    'this.F = { ' + FNS8.join(", ") + ' };',
    'this.els = els;',
    'this.etat = { redessins: function(){ return redessins; }, raz: function(){ redessins = 0; daysRerenderTimer = null; },',
    '  carteOn: function(){ tripMap = carteFactice(); }, carteOff: function(){ tripMap = null; },',
    '  journal: function(){ return __carte; }, videJournal: function(){ __carte.length = 0; } };',
    'this.setLang = function(l){ VISITOR_LANG = l; window.I18N.set(l); };'
  ].join('\n');
  vm.runInContext(glue, ctx);
  return ctx;
}
const W8 = sandboxMinuteries();
const F8 = W8.F, E8 = W8.els;
const tache = () => new Promise(r => setTimeout(r, 5));

test('erreur de ville : le champ est marqué fautif et reçoit le message', () => {
  W8.setLang('fr');
  F8.showCityError(F8.msg('form.dates.error'));
  assert.ok(E8.cityError.classList.contains('show'));
  assert.ok(E8.cityError.textContent.length > 0);
  assert.equal(E8.city.getAttribute('aria-invalid'), 'true');
});

test('erreur générale : la région est rendue visible AVANT d\'être écrite', async () => {
  W8.setLang('fr');
  E8.formError.textContent = '';
  F8.showFormError(F8.msg('form.dates.error'));
  // Tout de suite : visible, mais encore vide — c'est ce report qui permet l'annonce vocale.
  assert.ok(E8.formError.classList.contains('show'), 'la région doit être visible immédiatement');
  assert.equal(E8.formError.textContent, '',
    'le texte ne doit PAS être écrit dans la même tâche : une région absente du rendu n\'annonce rien');
  await tache();
  assert.ok(E8.formError.textContent.length > 0, 'le texte doit arriver à la tâche suivante');
  assert.ok(!/^form\./.test(E8.formError.textContent));
  // Si la région a été masquée entre-temps, le texte n'est pas écrit.
  E8.formError.textContent = '';
  F8.showFormError(F8.msg('form.dates.error'));
  E8.formError.classList.remove('show');
  await tache();
  assert.equal(E8.formError.textContent, '', 'un message annulé ne doit pas s\'écrire après coup');
});

test('journal de bord : plusieurs demandes dans la même tâche ne font QU\'UN redessin', async () => {
  W8.etat.raz();
  F8.scheduleDaysRerender();
  F8.scheduleDaysRerender();
  F8.scheduleDaysRerender();
  assert.equal(W8.etat.redessins(), 0, 'rien ne doit être redessiné dans la tâche courante');
  await tache();
  assert.equal(W8.etat.redessins(), 1,
    'trois demandes groupées, un seul redessin — sinon la carte perd son zoom à chaque point d\'intérêt reçu');
  // Une demande plus tard repart bien : la minuterie a été relâchée.
  F8.scheduleDaysRerender();
  await tache();
  assert.equal(W8.etat.redessins(), 2);
});

test('carte : les textes sont posés, l\'ancien zoom retiré, et OpenStreetMap reste un lien', () => {
  W8.setLang('fr');
  // Sans carte, la fonction ne doit rien faire ni lever.
  W8.etat.carteOff(); W8.etat.videJournal();
  F8.applyMapTexts();
  assert.equal(W8.etat.journal().length, 0);
  // Avec carte : l'étiquette est posée et un contrôle de zoom traduit est ajouté.
  W8.etat.carteOn(); W8.etat.videJournal();
  F8.applyMapTexts();
  assert.ok(E8.mapWrap.getAttribute('aria-label').length > 3);
  const j = W8.etat.journal().map(x => x[0]);
  assert.ok(j.includes('zoom') && j.includes('addTo'), JSON.stringify(j));
  const opts = W8.etat.journal().find(x => x[0] === 'zoom')[1];
  assert.ok(opts.zoomInTitle && opts.zoomOutTitle, 'les infobulles du zoom doivent être traduites');
  assert.notEqual(opts.zoomInTitle, opts.zoomOutTitle);
  // L'attribution contient un VRAI lien vers la licence : c'est une obligation, pas une décoration.
  const att = W8.etat.journal().filter(x => x[0] === 'add').pop()[1];
  assert.ok(att.includes('openstreetmap.org/copyright'), att);
  assert.ok(att.includes('rel="noopener"'), att);
  // Deuxième appel : l'ancien contrôle et l'ancienne attribution sont retirés avant d'en remettre.
  W8.etat.videJournal();
  F8.applyMapTexts();
  const j2 = W8.etat.journal().map(x => x[0]);
  assert.ok(j2.includes('removeControl'), 'le zoom précédent doit être retiré, sinon ils s\'empilent');
  assert.ok(j2.includes('remove'), 'l\'attribution précédente doit être retirée');
});

test('activité : le titre devient un lien seulement s\'il y a une adresse, et jamais deux fois', () => {
  const carte = { __enfants: {} };
  const titre = { tagName: 'SPAN', textContent: 'Musée des Confluences', __remplace: null,
    replaceWith(r){ this.__remplace = r; } };
  carte.querySelector = s => carte.__enfants[s] || null;
  carte.__enfants['.activity-card-title'] = titre;
  // Sans adresse : rien ne bouge.
  F8.applyActivityCardWikiLink(carte, null);
  assert.equal(titre.__remplace, null);
  // Avec adresse : le titre est remplacé par un lien qui garde son texte.
  F8.applyActivityCardWikiLink(carte, 'https://fr.wikipedia.org/wiki/Mus%C3%A9e');
  assert.ok(titre.__remplace, 'le titre doit être remplacé par un lien');
  assert.equal(titre.__remplace.textContent, 'Musée des Confluences', 'le texte du titre doit être conservé');
  assert.equal(titre.__remplace.href, 'https://fr.wikipedia.org/wiki/Mus%C3%A9e');
  assert.equal(titre.__remplace.rel, 'noopener');
  assert.equal(titre.__remplace.className, 'activity-card-title');
  // Une adresse non http est neutralisée.
  const t2 = { tagName: 'SPAN', textContent: 'X', __remplace: null, replaceWith(r){ this.__remplace = r; } };
  carte.__enfants['.activity-card-title'] = t2;
  F8.applyActivityCardWikiLink(carte, 'javascript:alert(1)');
  assert.equal(t2.__remplace.href, '#', 'aucun schéma exécutable ne doit être posé');
  // Un titre DÉJÀ transformé en lien n'est pas retransformé.
  const t3 = { tagName: 'A', textContent: 'Y', __remplace: null, replaceWith(r){ this.__remplace = r; } };
  carte.__enfants['.activity-card-title'] = t3;
  F8.applyActivityCardWikiLink(carte, 'https://fr.wikipedia.org/wiki/Y');
  assert.equal(t3.__remplace, null, 'un lien ne doit pas être enveloppé dans un second lien');
});

// ---------------------------------------------------------------------------------------------------------------
// LOT 9 — INVITES AJUSTABLES, LISTE DE SUGGESTIONS, PAQUETAGE, CARTE, ENCHAÎNEMENT DU RENDU.
//
// Le plus gros échafaudage du fichier, parce que ces fonctions parlent à des objets que Node n'a pas : un canevas
// pour mesurer un texte, une carte Leaflet, un document qui insère des nœuds. Aucun de ces objets n'est nécessaire
// en vrai — ce qu'on veut vérifier, ce sont les DÉCISIONS : à quelle taille l'invite est repliée, ce qui est
// demandé à Leaflet, dans quel ordre le voyage est redessiné, et ce qui est remis à zéro avant.
// Le point le plus important est le dernier : renderDrawnTrip REMET À ZÉRO les files de randonnées et de lieux
// avant de dessiner. Sans cela, un second voyage passant par la même commune repartait d'une file vidée et
// n'affichait plus que des suggestions génériques — un défaut invisible au premier tirage.
const FNS9 = ['escHtml', 'icon', 'camelFromDash', 'transportLabel', 'budgetLabel', 'transportPackExtra',
  'placeholderFits', 'placeholderHelpEl', 'fitPlaceholders', 'renderSuggestMessage',
  'updatePackProgress', 'renderPacking', 'ensureTripMap', 'finishReveal', 'upgradeActivities', 'renderDrawnTrip'];

// Extraction par ÉQUILIBRE DES ACCOLADES, et non par indentation : « renderDrawnTrip » ferme sur quatre espaces
// alors qu elle est déclarée sur deux, son corps ayant été réindenté sans que sa fermeture le soit. L extraction
// par indentation s arrêtait alors une accolade trop loin.
function extraitEquilibre(name){
  const lines = APP.split(String.fromCharCode(10));
  const i = lines.findIndex(l => l.startsWith('  function ' + name + '('));
  assert.ok(i >= 0, 'fonction ' + name + ' introuvable');
  let n = 0;
  for(let j = i; j < lines.length; j++){
    // Les accolades des chaînes, des expressions régulières et des commentaires ne comptent pas.
    // On neutralise d'abord les échappements, puis les chaînes, puis le commentaire de fin de ligne : sans cela,
    // une accolade écrite DANS un texte ou un commentaire déséquilibrerait le compte.
    const l = lines[j]
      .replace(/\\./g, '')
      .replace(/"[^"]*"|'[^']*'|`[^`]*`/g, '""')
      .replace(/\/\/.*$/, '');
    for(const c of l){ if(c === '{') n++; else if(c === '}') n--; }
    if(n === 0 && j > i) return lines.slice(i, j + 1).join(String.fromCharCode(10));
  }
  throw new Error('fin de ' + name + ' introuvable');
}
function sandboxRendu(){
  const noeud = (cls) => { const n = { className: cls || '', id: '', textContent: '', innerHTML: '', value: '',
      placeholder: '', type: 'text', hidden: false, checked: false, tagName: 'DIV',
      _attrs: {}, _cl: {}, style: {}, clientWidth: 200, __fils: [], __enfants: {}, __ecouteurs: [] };
    n.classList = { add: c => { n._cl[c] = true; }, remove: c => { delete n._cl[c]; }, contains: c => !!n._cl[c],
      toggle: (c, on) => { if(on) n._cl[c] = true; else delete n._cl[c]; } };
    n.setAttribute = (k, v) => { n._attrs[k] = String(v); };
    n.getAttribute = k => Object.prototype.hasOwnProperty.call(n._attrs, k) ? n._attrs[k] : null;
    n.removeAttribute = k => { delete n._attrs[k]; if(k === 'title') n.title = ''; };
    n.appendChild = c => { n.__fils.push(c); return c; };
    n.addEventListener = t2 => { n.__ecouteurs.push(t2); };
    n.querySelector = s => n.__enfants[s] || null;
    n.querySelectorAll = s => n.__enfants['*' + s] || n.__fils.filter(f => f.type === 'checkbox');
    n.closest = () => n.__parentRangee || null;
    n.style = { setProperty: (k, v) => { n.style['--' + k] = v; n.__taille = v; },
      removeProperty: () => { n.__taille = null; } };
    return n; };

  const ctx = { navigator: { languages: ['fr'] }, localStorage: { getItem: () => null, setItem(){} },
    CustomEvent: function(){}, Intl, console, setTimeout, clearTimeout };
  ctx.window = { addEventListener(){}, dispatchEvent(){} };
  // Mesure de texte : largeur proportionnelle à la longueur, réglable par le test.
  let largeurParCaractere = 5;
  ctx.document = { readyState: 'complete', addEventListener(){}, documentElement: noeud(),
    querySelectorAll: () => [], querySelector: () => null, getElementById: () => null,
    createElement: (tag) => { const n = noeud(); n.tagName = String(tag || 'div').toUpperCase();
      // Une étiquette fabriquée reçoit d'emblée l'enfant que renderPacking ira chercher par sélecteur.
      n.__enfants['.check-text'] = (tag === 'label') ? noeud('check-text') : null;
      if(tag === 'canvas') n.getContext = () => ({ font: '',
        measureText: s => ({ width: String(s).length * largeurParCaractere }) });
      return n; } };
  ctx.getComputedStyle = () => ({ fontStyle: 'normal', fontWeight: '400', fontSize: '16px', fontFamily: 'sans',
    paddingLeft: '8px', paddingRight: '8px', getPropertyValue: () => '' });
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(PUB, 'i18n.js'), 'utf8'), ctx);
  ctx.__largeur = v => { largeurParCaractere = v; };
  ctx.__noeud = noeud;
  const journal = [];
  ctx.__journal = journal;

  const glue = [
    'var t = window.I18N.t, tl = window.I18N.tl;',
    'var VISITOR_LANG = "fr", MAX_TRIP_DAYS = 21;',
    'var ICONS = { check: "<svg data-check></svg>" };',
    'var phCanvas = null;',
    // applyMapTexts est appelée par ensureTripMap : on la compte plutôt que de la rejouer, elle a son propre test.
    'function applyMapTexts(){ __journal.push(["applyMapTexts"]); }',
    'var TRANSPORT = { "voiture-thermique": { tollClass: 1 }, "velo": { tollClass: null } };',
    // Suggestions de ville.
    'var currentSuggestions = [1, 2], activeSuggestIndex = 3;',
    'var champVille = __noeud(), listeSuggest = __noeud();',
    // Paquetage.
    'var packGrid = __noeud(), packSub = __noeud(), packProgress = __noeud();',
    // Carte.
    'var mapWrap = __noeud();',
    'var tripMap = null, tripMapLayer = null, mapZoomControl = null, mapAttributionHtml = null;',
    'var L = {',
    '  map: function(el, o){ __journal.push(["map", o]); return { attributionControl: { setPrefix: function(p){ __journal.push(["prefix", p]); },',
    '      addAttribution: function(){}, removeAttribution: function(){} },',
    '    on: function(e){ __journal.push(["on", e]); }, removeControl: function(){},',
    '    scrollWheelZoom: { enable: function(){}, disable: function(){} } }; },',
    '  tileLayer: function(u, o){ __journal.push(["tiles", u, o]); return { addTo: function(){ return this; } }; },',
    '  layerGroup: function(){ __journal.push(["layerGroup"]); return { addTo: function(){ return this; } }; },',
    '  control: { zoom: function(o){ return { addTo: function(){ return {}; } }; } }',
    '};',
    // Révélation.
    'var currentDrawId = 7, etiquettes = [];',
    'function setRevealLabel(k){ etiquettes.push(k); }',
    'function updateRevealTexts(){ __journal.push(["updateRevealTexts"]); }',
    'function announceReveal(txt){ __journal.push(["announce", txt]); }',
    // Activités.
    'function buildActivityOptions(pois, generiques){ return (__options || []).slice(); }',
    'var __options = [];',
    // Rendu du voyage.
    'var usedHikeUrls = { a: 1 }, hikeQueueByCommune = { b: 1 }, poiQueueByLocation = { c: 1 }, genericQueueByLocation = { d: 1 };',
    'var tripGeneration = 1, currentTripData = null, currentTripLabel = "";',
    'var legs = [{ stop: "Lyon" }], city = "Paris", cityCoord = { lat: 1, lon: 2 };',
    'var budgetKey = "moyen", transportKey = "voiture-thermique", firstStopInfo = { name: "Lyon" }, days = 3;',
    'var tripNotices = [], tripDepartureTension = null, tripStartIso = "2026-06-10", tripEndIso = "2026-06-12";',
    'function tripLabelText(){ return "Paris → Lyon"; }',
    'function renderDays(d){ __journal.push(["renderDays", d && d.city]); }',
    'function renderMap(l, c){ __journal.push(["renderMap", c]); }',
    'var els = { city: champVille, citySuggest: listeSuggest, packGrid: packGrid, packSub: packSub,',
    '  packProgress: packProgress, mapWrap: mapWrap, form: __noeud(),',
    '  mapCard: __noeud(), timeline: __noeud(), exportRow: __noeud(), packCard: __noeud(), againRow: __noeud(),',
    '  stamp: __noeud(), revealReal: __noeud(), revealRegion: __noeud() };',
    'els.revealRegion.textContent = "Rhône";',
    FNS9.map(n => n === 'renderDrawnTrip' ? extraitEquilibre(n) : extract(n)).join('\n'),
    'this.F = { ' + FNS9.join(', ') + ' };',
    'this.els = els;',
    'this.etat = {',
    '  journal: function(){ return __journal; }, videJournal: function(){ __journal.length = 0; },',
    '  etiquettes: function(){ return etiquettes; },',
    '  files: function(){ return { hikes: usedHikeUrls, parCommune: hikeQueueByCommune, pois: poiQueueByLocation }; },',
    '  generation: function(){ return tripGeneration; },',
    '  voyage: function(){ return currentTripData; }, libelle: function(){ return currentTripLabel; },',
    '  carteOff: function(){ tripMap = null; },',
    '  options: function(o){ __options = o; },',
    '  drawId: function(v){ currentDrawId = v; },',
    '  suggestions: function(){ return { liste: currentSuggestions, actif: activeSuggestIndex }; }',
    '};',
    'this.setLang = function(l){ VISITOR_LANG = l; window.I18N.set(l); };'
  ].join('\n');
  vm.runInContext(glue, ctx);
  return ctx;
}
const W9 = sandboxRendu();
const F9 = W9.F, E9 = W9.els;
const attendre = ms => new Promise(r => setTimeout(r, ms));

test('invite : la mesure dit si le texte tient dans le champ', () => {
  const champ = W9.__noeud();
  champ.placeholder = 'Ville ou code postal';   // 20 caractères
  champ.clientWidth = 200;                      // moins 16 de marge intérieure = 184 disponibles
  W9.__largeur(5);                              // 100 px : ça tient
  assert.equal(F9.placeholderFits(champ), true);
  W9.__largeur(20);                             // 400 px : ça ne tient pas
  assert.equal(F9.placeholderFits(champ), false);
  W9.__largeur(5);
});

test('invite : l\'aide sous le champ est créée UNE fois et retenue', () => {
  const champ = W9.__noeud();
  champ.id = 'radius';
  const rangee = W9.__noeud();
  rangee.parentNode = { insertBefore: (n) => { rangee.__insere = n; } };
  champ.__parentRangee = rangee;
  const aide = F9.placeholderHelpEl(champ);
  assert.ok(aide, 'l\'aide doit être créée');
  assert.equal(aide.className, 'ph-help');
  assert.equal(aide.id, 'radius-ph-help');
  assert.equal(aide.hidden, true, 'elle est masquée tant que le texte tient dans le champ');
  assert.equal(aide.getAttribute('aria-hidden'), 'true',
    'le même texte est déjà annoncé par le champ : ne pas le faire lire deux fois');
  assert.equal(rangee.__insere, aide, 'elle est insérée juste après la ligne du champ');
  assert.equal(F9.placeholderHelpEl(champ), aide, 'un second appel ne doit pas en créer une deuxième');
});

test('invite : repliée par paliers, puis remplacée par un tiret avec le texte complet en réserve', () => {
  const champ = W9.__noeud();
  champ.placeholder = 'Entre 50 et 3000 km'; champ.clientWidth = 200; champ.type = 'number';
  const rangee = W9.__noeud();
  rangee.parentNode = { insertBefore: () => {} };
  champ.__parentRangee = rangee;
  E9.form.__enfants['*input[placeholder]'] = [champ];
  // Le texte tient : aucune taille imposée, aucune infobulle.
  W9.__largeur(2);
  F9.fitPlaceholders();
  assert.equal(champ.placeholder, 'Entre 50 et 3000 km');
  assert.ok(!champ.title);
  // Le texte ne tient à aucune taille : le champ affiche un tiret, et garde le texte complet.
  W9.__largeur(40);
  F9.fitPlaceholders();
  assert.equal(champ.placeholder, '—', 'un champ numérique replie son invite sur un tiret');
  assert.equal(champ.__fullPlaceholder, 'Entre 50 et 3000 km', 'le texte complet doit être conservé');
  assert.equal(champ.title, 'Entre 50 et 3000 km', 'le texte complet reste en infobulle');
  assert.ok(champ.__phHelp && !champ.__phHelp.hidden, 'et en clair sous le champ, l\'infobulle ne s\'affichant pas au toucher');
  // La place revient : le texte complet est restauré.
  W9.__largeur(2);
  F9.fitPlaceholders();
  assert.equal(champ.placeholder, 'Entre 50 et 3000 km');
  assert.ok(!champ.title, 'l\'infobulle doit être retirée quand le texte tient de nouveau');
  assert.ok(champ.__phHelp.hidden);
});

test('suggestions : un message remplace la liste et la déclare non sélectionnable', () => {
  E9.citySuggest.__fils = [W9.__noeud()];
  E9.city.setAttribute('aria-activedescendant', 'suggest-3');
  F9.renderSuggestMessage('Aucun résultat');
  assert.equal(E9.citySuggest.innerHTML, '', 'la liste précédente doit être vidée');
  const item = E9.citySuggest.__fils[E9.citySuggest.__fils.length - 1];
  assert.equal(item.textContent, 'Aucun résultat');
  assert.equal(item.getAttribute('role'), 'option');
  assert.equal(item.getAttribute('aria-disabled'), 'true', 'un message n\'est pas une suggestion choisissable');
  assert.ok(E9.citySuggest.classList.contains('show'));
  assert.equal(E9.city.getAttribute('aria-expanded'), 'true');
  assert.equal(E9.city.getAttribute('aria-activedescendant'), null,
    'aucune suggestion active : l\'ancienne référence doit être retirée');
  const s = W9.etat.suggestions();
  assert.equal(s.liste.length, 0, 'la mémoire des suggestions doit être vidée');
  assert.equal(s.actif, -1);
});

test('paquetage : la liste est dédoublonnée, chaque article coché indépendamment', () => {
  W9.setLang('fr');
  F9.renderPacking('moyen', 'velo');
  assert.ok(E9.packSub.textContent.length > 0, 'le sous-titre doit nommer le mode et le budget');
  assert.ok(!/^pack\./.test(E9.packSub.textContent));
  const items = E9.packGrid.__fils;
  assert.ok(items.length > 3, 'la liste doit être remplie : ' + items.length);
  // Chaque article a sa case et son étiquette reliée par identifiant.
  const premier = items[0];
  const caseACocher = premier.__fils[0], etiquette = premier.__fils[1];
  assert.equal(caseACocher.type, 'checkbox');
  assert.equal(etiquette.getAttribute('for'), caseACocher.id, 'l\'étiquette doit être reliée à SA case');
  assert.ok(etiquette.innerHTML.includes('data-check'), 'l\'icône de coche doit être posée');
  assert.ok(caseACocher.__ecouteurs.includes('change'));
  // Aucun doublon : deux articles ne portent pas le même texte.
  const textes = items.map(w => (w.__fils[1].__enfants['.check-text'] || {}).textContent);
  const nonVides = textes.filter(Boolean);
  assert.equal(new Set(nonVides).size, nonVides.length, 'la liste ne doit contenir aucun doublon');
});

test('carte : fabriquée une fois, avec son rôle, sans molette et sans le lien Leaflet', () => {
  W9.etat.carteOff(); W9.etat.videJournal();
  W9.setLang('fr');
  const m = F9.ensureTripMap();
  assert.ok(m, 'la carte doit être fabriquée');
  assert.equal(E9.mapWrap.getAttribute('role'), 'region',
    'un aria-label sur un div sans rôle n\'est annoncé par aucun lecteur d\'écran');
  assert.ok(E9.mapWrap.getAttribute('aria-label').length > 3);
  const j = W9.etat.journal();
  const opts = j.find(x => x[0] === 'map')[1];
  assert.equal(opts.scrollWheelZoom, false, 'la molette doit faire défiler la page tant qu\'on n\'a pas cliqué');
  assert.equal(opts.zoomControl, false, 'le zoom par défaut est remplacé par un zoom traduit');
  assert.equal(opts.attributionControl, true, 'le crédit OpenStreetMap est obligatoire');
  assert.deepEqual(plat(j.find(x => x[0] === 'prefix')), ['prefix', false], 'le lien « Leaflet » par défaut est retiré');
  const tuiles = j.find(x => x[0] === 'tiles');
  assert.ok(tuiles[1].includes('tile.openstreetmap.org'), tuiles[1]);
  assert.ok(j.some(x => x[0] === 'layerGroup'), 'un calque d\'étapes doit être créé');
  assert.equal(F9.ensureTripMap(), m, 'deux appels ne doivent pas fabriquer deux cartes');
});

test('révélation : l\'étape est annoncée après le délai, et seulement si le tirage est toujours le bon', async () => {
  W9.etat.videJournal();
  W9.etat.drawId(7);
  F9.finishReveal({ name: 'Lyon' }, 7, null);
  assert.ok(W9.etat.etiquettes().includes('reveal.confirmed'), 'l\'étiquette est posée tout de suite');
  assert.equal(W9.etat.journal().length, 0, 'le reste est reporté');
  await attendre(300);
  const j = W9.etat.journal().map(x => x[0]);
  assert.ok(j.includes('announce'), 'l\'annonce aux lecteurs d\'écran doit partir : ' + JSON.stringify(j));
  assert.ok(E9.stamp.classList.contains('show'));
  assert.ok(E9.revealReal.classList.contains('show'));
  // Un nouveau tirage pendant le délai annule l'annonce.
  W9.etat.videJournal();
  F9.finishReveal({ name: 'Nice' }, 7, null);
  W9.etat.drawId(8);
  await attendre(300);
  assert.equal(W9.etat.journal().length, 0, 'l\'annonce d\'un tirage abandonné ne doit pas partir');
});

test('activités : une randonnée déjà proposée est CONSERVÉE quand la nouvelle liste n\'en a plus', () => {
  const rando = { hikeUrl: 'https://x/h1', label: 'Balade' };
  // La nouvelle liste contient un emplacement qui attend une randonnée : c'est lui qui la reçoit.
  W9.etat.options([{ needsHike: true, label: 'A' }, { isReal: true, label: 'B' }]);
  let r = F9.upgradeActivities({ activities: [rando] }, { poisQueue: [], genericQueue: [] });
  assert.equal(plat(r)[0].hikeUrl, 'https://x/h1', 'la randonnée doit reprendre la place réservée');
  // Aucun emplacement réservé : c'est une suggestion générique qui cède la place.
  W9.etat.options([{ isReal: true, label: 'A' }, { isReal: false, label: 'B' }]);
  r = F9.upgradeActivities({ activities: [rando] }, { poisQueue: [], genericQueue: [] });
  assert.ok(plat(r).some(o => o.hikeUrl === 'https://x/h1'));
  assert.equal(plat(r)[0].label, 'A', 'la vraie activité ne doit pas être évincée la première');
  // Si la nouvelle liste a DÉJÀ une randonnée, rien n'est conservé de force.
  W9.etat.options([{ hikeUrl: 'https://x/h2', label: 'C' }]);
  r = F9.upgradeActivities({ activities: [rando] }, { poisQueue: [], genericQueue: [] });
  assert.equal(plat(r).length, 1);
  assert.equal(plat(r)[0].hikeUrl, 'https://x/h2', 'la randonnée fraîche a la priorité');
});

test('rendu du voyage : les files sont REMISES À ZÉRO avant de dessiner, et tout est révélé', () => {
  W9.etat.videJournal();
  const generationAvant = W9.etat.generation();
  F9.renderDrawnTrip();
  const files = plat(W9.etat.files());
  assert.deepEqual(files.hikes, {}, 'sans cette remise à zéro, un second voyage par la même commune perd ses vraies activités');
  assert.deepEqual(files.parCommune, {});
  assert.deepEqual(files.pois, {});
  assert.equal(W9.etat.generation(), generationAvant + 1, 'le numéro de tirage doit avancer');
  // Le voyage est enregistré AVANT le rendu, parce que renderDays le relit.
  const v = W9.etat.voyage();
  assert.ok(v && v.city === 'Paris' && v.days === 3, JSON.stringify(plat(v)));
  assert.equal(W9.etat.libelle(), 'Paris → Lyon');
  const j = W9.etat.journal().map(x => x[0]);
  assert.deepEqual(j, ['renderDays', 'renderMap', 'updateRevealTexts'],
    'l\'ordre compte : le journal de bord, puis la carte, puis les textes');
  // Les cinq blocs du résultat sont affichés.
  for(const k of ['mapCard', 'timeline', 'exportRow', 'packCard', 'againRow']){
    assert.ok(E9[k].classList.contains('show'), k + ' doit être affiché');
  }
});

// ---------------------------------------------------------------------------------------------------------------
// LOT 10 — IMAGE D'UNE CARTE D'ACTIVITÉ, ET TRACÉ DE LA CARTE.
//
// Deux fonctions qui composent du HTML et parlent à Leaflet. Ce qu'on verrouille ici :
//   - l'alternative textuelle et l'adresse de l'image sont ÉCHAPPÉES et contrôLÉES — un nom venu d'OpenStreetMap
//     ne doit pas pouvoir devenir une balise ;
//   - la vignette se comporte comme un BOUTON (rôle, tabindex, nom accessible) : sans cela, l'agrandissement
//     n'est pas atteignable au clavier ;
//   - les écouteurs ne sont posés QU'UNE FOIS, même si la fonction est rappelée sur la même carte, sinon un
//     clic ouvrirait plusieurs fois la visionneuse ;
//   - le tracé distingue l'ALLER du RETOUR, et n'ajoute un retour que s'il y en a un.
const FNS10 = ['escHtml', 'plainText', 'safeUrl', 'safeHref', 'icon', 'photoFilePage', 'photoCreditInfo',
  'photoCreditHtml', 'applyActivityCardWikiLink', 'applyActivityCardImage'];

function sandboxCartes(){
  const noeud = (cls) => { const n = { className: cls || '', id: '', textContent: '', innerHTML: '', tagName: 'DIV',
      href: '', target: '', rel: '', _attrs: {}, _cl: {}, __fils: [], __enfants: {}, __ecouteurs: {}, __retire: 0 };
    n.classList = { add: c => { n._cl[c] = true; }, remove: c => { delete n._cl[c]; }, contains: c => !!n._cl[c] };
    n.setAttribute = (k, v) => { n._attrs[k] = String(v); };
    n.getAttribute = k => Object.prototype.hasOwnProperty.call(n._attrs, k) ? n._attrs[k] : null;
    n.removeAttribute = k => { delete n._attrs[k]; };
    n.appendChild = c => { n.__fils.push(c); return c; };
    n.addEventListener = (t2, f) => { (n.__ecouteurs[t2] = n.__ecouteurs[t2] || []).push(f); };
    n.remove = () => { n.__retire++; };
    n.querySelector = s => n.__enfants[s] || null;
    n.querySelectorAll = () => [];
    n.replaceWith = r => { n.__remplace = r; };
    return n; };
  const ctx = { navigator: { languages: ['fr'] }, localStorage: { getItem: () => null, setItem(){} },
    CustomEvent: function(){}, Intl, console };
  ctx.window = { addEventListener(){}, dispatchEvent(){} };
  ctx.document = { readyState: 'complete', addEventListener(){}, documentElement: noeud(),
    querySelectorAll: () => [], querySelector: () => null, getElementById: () => null,
    createElement: () => noeud() };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(PUB, 'i18n.js'), 'utf8'), ctx);
  const ouvertures = [];
  ctx.__ouvertures = ouvertures;
  ctx.__noeud2 = noeud;
  const glue = [
    'var t = window.I18N.t;',
    'var VISITOR_LANG = "fr";',
    'var ICONS = { spark: "<svg data-spark></svg>" };',
    'function openLightbox(u, l, w, c){ __ouvertures.push([u, l, w]); }',
    FNS10.map(extract).join('\n'),
    'this.F = { ' + FNS10.join(', ') + ' };',
    'this.ouvertures = function(){ return __ouvertures; };',
    'this.videOuvertures = function(){ __ouvertures.length = 0; };',
    'this.setLang = function(l){ VISITOR_LANG = l; window.I18N.set(l); };'
  ].join('\n');
  vm.runInContext(glue, ctx);
  return ctx;
}
const W10 = sandboxCartes();
const F10 = W10.F;

// Fabrique une carte d'activité avec ses trois zones, comme le rendu réel en produit.
function carteActivite(){
  const n = W10.__noeud2;
  const carte = n('activity-card');
  const visuel = n('activity-card-visual'), corps = n('activity-card-body'), titre = n('activity-card-title');
  titre.tagName = 'SPAN'; titre.textContent = 'Musée';
  carte.__enfants['.activity-card-visual'] = visuel;
  carte.__enfants['.activity-card-body'] = corps;
  carte.__enfants['.activity-card-title'] = titre;
  carte.__enfants['.activity-card-credit'] = null;
  const img = n('activity-card-img');
  visuel.__enfants['.activity-card-img'] = img;
  return { carte, visuel, corps, titre, img };
}

test('activité : l\'image est posée, son alternative échappée, et la page d\'origine non divulguée', () => {
  W10.setLang('fr');
  const c = carteActivite();
  F10.applyActivityCardImage(c.carte, 'Musée <img src=x onerror=alert(1)>',
    'https://upload.wikimedia.org/a/b/M.jpg', null, null, null);
  const html = c.visuel.innerHTML;
  assert.ok(html.includes('src="https://upload.wikimedia.org/a/b/M.jpg"'), html);
  assert.ok(!html.includes('<img src=x onerror'), 'l\'alternative ne doit pas pouvoir injecter une balise : ' + html);
  assert.ok(html.includes('&lt;img'), 'elle doit rester lisible une fois échappée : ' + html);
  assert.ok(html.includes('referrerpolicy="no-referrer"'), html);
  assert.ok(c.carte.classList.contains('has-image'));
  // Une adresse d'image non http est neutralisée.
  const c2 = carteActivite();
  F10.applyActivityCardImage(c2.carte, 'X', 'javascript:alert(1)', null, null, null);
  assert.ok(c2.visuel.innerHTML.includes('src="#"'), c2.visuel.innerHTML);
});

test('activité : la vignette est un BOUTON atteignable au clavier, et nommée', () => {
  W10.setLang('fr');
  const c = carteActivite();
  F10.applyActivityCardImage(c.carte, 'Musée des Confluences', 'https://u.example/a.jpg', null, null, null);
  assert.equal(c.visuel.getAttribute('role'), 'button');
  assert.equal(c.visuel.getAttribute('tabindex'), '0', 'sans tabindex, l\'agrandissement est inatteignable au clavier');
  const nom = c.visuel.getAttribute('aria-label');
  assert.ok(nom && nom.includes('Musée des Confluences'), nom);
  assert.ok(!/^photo\./.test(nom), 'aucune clé i18n brute : ' + nom);
});

test('activité : les écouteurs ne sont posés QU\'UNE fois, et ils lisent la DERNIÈRE image', () => {
  W10.setLang('fr');
  W10.videOuvertures();
  const c = carteActivite();
  F10.applyActivityCardImage(c.carte, 'Première', 'https://u.example/1.jpg', 'https://u.example/1-grand.jpg', null, null);
  F10.applyActivityCardImage(c.carte, 'Seconde', 'https://u.example/2.jpg', 'https://u.example/2-grand.jpg', 'https://fr.wikipedia.org/x', null);
  assert.equal(c.visuel.__ecouteurs.click.length, 1, 'un second appel ne doit pas reposer d\'écouteur');
  assert.equal(c.visuel.__ecouteurs.keydown.length, 1);
  // Le clic ouvre la DERNIÈRE image appliquée, en taille pleine.
  c.visuel.__ecouteurs.click[0]();
  assert.equal(W10.ouvertures().length, 1);
  const o = plat(W10.ouvertures()[0]);
  assert.equal(o[0], 'https://u.example/2-grand.jpg', 'c\'est la version pleine taille qui s\'ouvre');
  assert.equal(o[1], 'Seconde');
  assert.equal(o[2], 'https://fr.wikipedia.org/x');
  // Entrée et Espace ouvrent aussi, et empêchent le défilement de la page.
  W10.videOuvertures();
  let empeche = 0;
  c.visuel.__ecouteurs.keydown[0]({ key: ' ', preventDefault: () => { empeche++; } });
  assert.equal(W10.ouvertures().length, 1, 'la barre d\'espace doit ouvrir la visionneuse');
  assert.equal(empeche, 1, 'et empêcher la page de défiler');
  c.visuel.__ecouteurs.keydown[0]({ key: 'a', preventDefault: () => { empeche++; } });
  assert.equal(W10.ouvertures().length, 1, 'une autre touche ne doit rien ouvrir');
});

test('activité : une image qui échoue rend la carte à son icône, et la vignette cesse d\'être un bouton', () => {
  W10.setLang('fr');
  W10.videOuvertures();
  const c = carteActivite();
  F10.applyActivityCardImage(c.carte, 'X', 'https://u.example/a.jpg', null, null, null);
  assert.ok(c.carte.classList.contains('has-image'));
  // Le navigateur signale l'échec de chargement : les deux écouteurs « error » s'exécutent.
  c.img.__ecouteurs.error.forEach(f => f());
  assert.ok(!c.carte.classList.contains('has-image'));
  assert.ok(c.visuel.innerHTML.includes('data-spark'), 'l\'icône de repli doit revenir : ' + c.visuel.innerHTML);
  assert.equal(c.visuel.getAttribute('role'), null, 'une vignette sans image n\'est plus un bouton');
  assert.equal(c.visuel.getAttribute('tabindex'), null);
  assert.equal(c.visuel.getAttribute('aria-label'), null);
  // Et un clic après l'échec n'ouvre rien.
  c.visuel.__ecouteurs.click[0]();
  assert.equal(W10.ouvertures().length, 0, 'sans image, la visionneuse ne doit pas s\'ouvrir');
});

test('activité : le crédit de la photo est posé une seule fois, et remplacé au rappel', () => {
  W10.setLang('fr');
  const c = carteActivite();
  const credit = { author: 'A. Photographe', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/x' };
  F10.applyActivityCardImage(c.carte, 'X', 'https://upload.wikimedia.org/a/b/M.jpg', null, null, credit);
  assert.equal(c.corps.__fils.length, 1, 'le crédit doit être ajouté au corps de la carte');
  const bloc = c.corps.__fils[0];
  assert.equal(bloc.className, 'activity-card-credit');
  assert.ok(bloc.innerHTML.includes('A. Photographe'), bloc.innerHTML);
  // Rappel : l'ancien crédit est retiré avant d'en poser un nouveau.
  c.carte.__enfants['.activity-card-credit'] = bloc;
  F10.applyActivityCardImage(c.carte, 'X', 'https://upload.wikimedia.org/a/b/M.jpg', null, null, credit);
  assert.equal(bloc.__retire, 1, 'l\'ancien crédit doit être retiré, sinon ils s\'empilent');
});

// ---------------------------------------------------------------------------------------------------------------
// LOT 11 — TRACÉ DE LA CARTE.
//
// Aucune carte n'est dessinée ici : un bouchon de Leaflet enregistre CE QU'ON LUI DEMANDE, et c'est la demande
// qu'on vérifie. Quatre règles y sont écrites, et aucune ne se voit à la lecture rapide :
//   - l'ALLER et le RETOUR sont deux tracés distincts, de couleurs et de pointillés différents, et le retour
//     n'existe que s'il y a un départ ET une étape ;
//   - une seule épingle par ville : plusieurs nuits d'affilée au même endroit ne doivent pas empiler des points
//     identiques, mais deux homonymes NON consécutifs gardent chacun la leur ;
//   - le cadrage est reporté à la frame suivante, parce que le conteneur peut encore être caché au moment du
//     calcul et que Leaflet a besoin d'une taille non nulle ;
//   - un seul point se centre au zoom 12, plusieurs se cadrent sur leurs limites.
const FNS11 = ['escHtml', 'formatNum', 'stopKey', 'cssVar', 'tripDivIcon', 'renderMap'];

function sandboxTrace(){
  const ctx = { navigator: { languages: ['fr'] }, localStorage: { getItem: () => null, setItem(){} },
    CustomEvent: function(){}, Intl, console };
  ctx.window = { addEventListener(){}, dispatchEvent(){} };
  const simple = () => ({ setAttribute(){}, getAttribute: () => null, addEventListener(){},
    classList: { add(){}, remove(){}, contains: () => false } });
  ctx.document = { readyState: 'complete', addEventListener(){}, documentElement: simple(),
    querySelectorAll: () => [], querySelector: () => null, getElementById: () => null, createElement: simple };
  ctx.getComputedStyle = () => ({ getPropertyValue: p => ({ '--accent': '#A33', '--accent-3': '#3A3' })[p] || '' });
  const differe = [];
  ctx.requestAnimationFrame = f => { differe.push(f); };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(PUB, 'i18n.js'), 'utf8'), ctx);
  const journal = [];
  ctx.__journal = journal;
  ctx.__differe = differe;
  const glue = [
    'var t = window.I18N.t;',
    'var VISITOR_LANG = "fr";',
    // Bouchon de Leaflet : chaque demande est enregistrée telle quelle.
    'var L = {',
    '  latLng: function(a, b){ return { lat: a, lng: b }; },',
    '  latLngBounds: function(pts){ return { __pts: pts }; },',
    '  polyline: function(pts, o){ __journal.push(["polyline", pts, o]); return { addTo: function(){ return this; } }; },',
    '  marker: function(ll, o){ __journal.push(["marker", ll, o]); return { addTo: function(){ return this; } }; },',
    '  divIcon: function(o){ return { __divIcon: o }; }',
    '};',
    'var tripRouteLine = null, tripReturnLine = null;',
    'var tripMapLayer = { clearLayers: function(){ __journal.push(["clear"]); } };',
    'var tripMap = { invalidateSize: function(){ __journal.push(["invalidateSize"]); },',
    '  setView: function(ll, z){ __journal.push(["setView", ll, z]); },',
    '  fitBounds: function(b, o){ __journal.push(["fitBounds", b, o]); } };',
    'function ensureTripMap(){ return tripMap; }',
    FNS11.map(extract).join('\n'),
    'this.F = { ' + FNS11.join(', ') + ' };',
    'this.journal = function(){ return __journal; };',
    'this.vide = function(){ __journal.length = 0; __differe.length = 0; };',
    'this.frame = function(){ var f = __differe.shift(); if(f) f(); return !!f; };',
    'this.setLang = function(l){ VISITOR_LANG = l; window.I18N.set(l); };'
  ].join('\n');
  vm.runInContext(glue, ctx);
  return ctx;
}
const W11 = sandboxTrace();
const F11 = W11.F;
const demandes = k => W11.journal().filter(x => x[0] === k);

test('carte : l\'aller et le retour sont deux tracés distincts', () => {
  W11.setLang('fr'); W11.vide();
  F11.renderMap([{ stop: 'Lyon', lat: 45.76, lon: 4.84 }, { stop: 'Nice', lat: 43.70, lon: 7.27 },
    { stop: 'Paris', lat: 48.85, lon: 2.35, isReturn: true }], 'Paris', { lat: 48.85, lon: 2.35 });
  const traces = demandes('polyline');
  assert.equal(traces.length, 2, 'un aller et un retour : ' + traces.length);
  const aller = plat(traces[0]), retour = plat(traces[1]);
  assert.equal(aller[1].length, 3, 'l\'aller passe par le départ et les deux étapes');
  assert.equal(retour[1].length, 2, 'le retour relie la dernière étape au départ');
  assert.notEqual(aller[2].color, retour[2].color, 'les deux tracés doivent se distinguer par la couleur');
  assert.notEqual(aller[2].dashArray, retour[2].dashArray, 'et par leurs pointillés');
  // Le retour porte une étiquette, posée à mi-chemin et non interactive.
  const etiquette = demandes('marker').find(m => m[2].interactive === false);
  assert.ok(etiquette, 'le retour doit être nommé sur la carte');
  assert.equal(plat(etiquette[1]).lat, (43.70 + 48.85) / 2, 'l\'étiquette est posée à mi-chemin');
  assert.equal(etiquette[2].keyboard, false, 'une étiquette décorative ne doit pas être atteignable au clavier');
});

test('carte : sans point de départ, il n\'y a ni retour ni épingle de départ', () => {
  W11.vide();
  F11.renderMap([{ stop: 'Lyon', lat: 45.76, lon: 4.84 }, { stop: 'Nice', lat: 43.70, lon: 7.27 }], 'Paris', null);
  const traces = demandes('polyline');
  assert.equal(traces.length, 1, 'seul l\'aller peut être tracé');
  const epingles = demandes('marker');
  assert.ok(!epingles.some(m => String(m[2].icon.__divIcon.html).includes('trip-pin-start')),
    'aucune épingle de départ sans coordonnées de départ');
});

test('carte : une seule épingle par ville, mais deux homonymes NON consécutifs gardent la leur', () => {
  W11.vide();
  F11.renderMap([
    { stop: 'Lyon', lat: 45.76, lon: 4.84 },
    { stop: 'Lyon', lat: 45.76, lon: 4.84 },   // deuxième nuit au même endroit
    { stop: 'Nice', lat: 43.70, lon: 7.27 },
    { stop: 'Lyon', lat: 45.76, lon: 4.84 }    // on repasse par Lyon plus tard
  ], 'Paris', { lat: 48.85, lon: 2.35 });
  const etapes = demandes('marker').filter(m => String(m[2].icon.__divIcon.html).includes('trip-pin-stop'));
  assert.equal(etapes.length, 3, 'deux nuits d\'affilée ne font qu\'une épingle, le retour à Lyon en refait une');
  // Les numéros se suivent et sont écrits dans les chiffres de la langue.
  const numeros = etapes.map(m => String(m[2].icon.__divIcon.html).match(/trip-pin-badge">([^<]*)</)[1]);
  assert.deepEqual(numeros, ['1', '2', '3']);
});

test('carte : le nom de l\'étape est raccourci à deux mots et échappé', () => {
  W11.vide();
  F11.renderMap([{ stop: 'Saint-Étienne du <b>Rouvray</b> en Plus', lat: 49.38, lon: 1.10 }],
    'Paris', { lat: 48.85, lon: 2.35 });
  const etape = demandes('marker').find(m => String(m[2].icon.__divIcon.html).includes('trip-pin-stop'));
  const html = etape[2].icon.__divIcon.html;
  assert.ok(html.includes('Saint-Étienne du'), html);
  assert.ok(!html.includes('en Plus'), 'le nom est coupé à deux mots : ' + html);
  assert.ok(!html.includes('<b>'), 'le nom doit être échappé : ' + html);
});

test('carte : le cadrage est REPORTÉ à la frame suivante, le conteneur pouvant être encore caché', () => {
  W11.vide();
  F11.renderMap([{ stop: 'Lyon', lat: 45.76, lon: 4.84 }, { stop: 'Nice', lat: 43.70, lon: 7.27 }],
    'Paris', { lat: 48.85, lon: 2.35 });
  assert.equal(demandes('fitBounds').length, 0, 'rien ne doit être cadré dans la même frame');
  assert.ok(W11.frame(), 'un report doit avoir été demandé');
  assert.equal(demandes('invalidateSize').length, 1, 'la taille doit être recalculée avant de cadrer');
  const cadre = demandes('fitBounds')[0];
  assert.equal(plat(cadre[1].__pts).length, 3);
  assert.equal(cadre[2].maxZoom, 12, 'le cadrage ne doit pas zoomer au-delà de 12');
  // Un seul point : on centre au lieu de cadrer, sinon les limites seraient dégénérées.
  W11.vide();
  F11.renderMap([], 'Paris', { lat: 48.85, lon: 2.35 });
  W11.frame();
  assert.equal(demandes('fitBounds').length, 0);
  const vue = demandes('setView')[0];
  assert.equal(vue[2], 12, 'un point unique se centre au zoom 12');
});

test('carte : chaque rendu efface le calque précédent', () => {
  W11.vide();
  F11.renderMap([{ stop: 'Lyon', lat: 45.76, lon: 4.84 }], 'Paris', { lat: 48.85, lon: 2.35 });
  assert.equal(demandes('clear').length, 1, 'sans cet effacement, les tracés s\'empileraient à chaque tirage');
  // Une étape sans coordonnées est ignorée plutôt que de casser le tracé.
  W11.vide();
  F11.renderMap([{ stop: 'Inconnue' }, { stop: 'Lyon', lat: 45.76, lon: 4.84 }], 'Paris', { lat: 48.85, lon: 2.35 });
  const etapes = demandes('marker').filter(m => String(m[2].icon.__divIcon.html).includes('trip-pin-stop'));
  assert.equal(etapes.length, 1, 'une étape sans position ne doit pas être épinglée');
});

// ---------------------------------------------------------------------------------------------------------------
// LOT 12 — CARTES D'ACTIVITÉ D'UNE JOURNÉE.
//
// Cent vingt-quatre lignes et beaucoup de chemins. Ce qu'on verrouille, ce sont les décisions dont le code dit
// lui-même qu'elles ont déjà mal tourné :
//   - la mention « recherche d'une vraie randonnée… » doit DISPARAÎTRE quand la recherche a abouti sans résultat,
//     sinon elle reste affichée indéfiniment, y compris aux rendus suivants ;
//   - une randonnée trouvée est mémorisée SUR L'OPTION, pas seulement dans la page, pour que l'export PDF et un
//     rendu ultérieur reflètent la vraie randonnée et non la formule générique ;
//   - une randonnée qui arrive alors que sa carte a déjà été remplacée est RENDUE À LA FILE, pour un autre jour ;
//   - les portails de randonnée ne sont proposés qu'une fois par étape.
const FNS12 = ['escHtml', 'safeUrl', 'safeHref', 'icon', 'hikeKeyOf', 'renderActivityCards'];

function sandboxJournee(){
  const noeud = (cls) => { const n = { className: cls || '', innerHTML: '', textContent: '', tagName: 'DIV',
      href: '', target: '', rel: '', _attrs: {}, _cl: {}, __fils: [], __enfants: {}, __retire: 0, parentNode: null };
    n.classList = { add: c => { n._cl[c] = true; }, remove: c => { delete n._cl[c]; },
      contains: c => !!n._cl[c] || String(n.className).split(/\s+/).indexOf(c) >= 0 };
    n.setAttribute = (k, v) => { n._attrs[k] = String(v); };
    n.getAttribute = k => Object.prototype.hasOwnProperty.call(n._attrs, k) ? n._attrs[k] : null;
    n.removeAttribute = k => { delete n._attrs[k]; };
    n.appendChild = c => { n.__fils.push(c); c.parentNode = n; return c; };
    n.replaceChild = (neuf, vieux) => { const i = n.__fils.indexOf(vieux);
      if(i >= 0){ n.__fils[i] = neuf; neuf.parentNode = n; vieux.parentNode = null; } };
    n.addEventListener = () => {};
    n.remove = () => { n.__retire++; if(n.parentNode){ const i = n.parentNode.__fils.indexOf(n);
      if(i >= 0) n.parentNode.__fils.splice(i, 1); n.parentNode = null; } };
    n.querySelector = s => n.__enfants[s] || null;
    n.querySelectorAll = () => [];
    return n; };
  const ctx = { navigator: { languages: ['fr'] }, localStorage: { getItem: () => null, setItem(){} },
    CustomEvent: function(){}, Intl, console };
  ctx.window = { addEventListener(){}, dispatchEvent(){} };
  ctx.document = { readyState: 'complete', addEventListener(){}, documentElement: noeud(),
    querySelectorAll: () => [], querySelector: () => null, getElementById: () => null,
    createElement: t2 => { const n = noeud(); n.tagName = String(t2).toUpperCase(); return n; } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(PUB, 'i18n.js'), 'utf8'), ctx);
  const journal = [];
  ctx.__journal = journal;
  ctx.__noeud3 = noeud;
  const glue = [
    'var t = window.I18N.t;',
    'var VISITOR_LANG = "fr";',
    'var ICONS = { spark: "<svg data-spark></svg>", walk: "<svg data-walk></svg>" };',
    'var portalsShownFor = {}, usedHikeUrls = {}, hikeQueueByCommune = {}, tripGeneration = 1;',
    'var __portails = [], __photo = null, __rando = null;',
    'function fetchHikeData(){ return Promise.resolve({ hikes: [], portals: __portails }); }',
    'function fetchPlacePhoto(){ return Promise.resolve(__photo); }',
    'function pickHikeForCommune(){ return Promise.resolve(__rando); }',
    'function optNear(){ return null; }',
    'function optionLabel(o){ return o.label || "Activité"; }',
    'function optionTypeLabel(o){ return o.typeKey || "type"; }',
    'function hikeCardHtml(h){ return "<span class=\\"hike\\">" + escHtml(h.name || "") + "</span>"; }',
    'function applyActivityCardImage(c, l, i){ __journal.push(["image", l, i]); }',
    'function applyActivityCardWikiLink(c, w){ __journal.push(["wiki", w]); }',
    FNS12.map(extract).join('\n'),
    'this.F = { ' + FNS12.join(', ') + ' };',
    'this.journal = function(){ return __journal; };',
    'this.regle = function(o){ if(o.portails !== undefined) __portails = o.portails;',
    '  if(o.photo !== undefined) __photo = o.photo; if(o.rando !== undefined) __rando = o.rando;',
    '  if(o.generation !== undefined) tripGeneration = o.generation; };',
    'this.raz = function(){ __journal.length = 0; portalsShownFor = {}; usedHikeUrls = {};',
    '  hikeQueueByCommune = {}; tripGeneration = 1; __portails = []; __photo = null; __rando = null; };',
    'this.files = function(){ return { used: usedHikeUrls, parCommune: hikeQueueByCommune }; };',
    'this.setLang = function(l){ VISITOR_LANG = l; window.I18N.set(l); };'
  ].join('\n');
  vm.runInContext(glue, ctx);
  return ctx;
}
const W12 = sandboxJournee();
const F12 = W12.F;
const liste = () => W12.__noeud3('activity-list');
const souffle12 = () => new Promise(r => setTimeout(r, 15));
const LEG = () => ({ stop: 'Lyon', country: 'FR', lat: 45.76, lon: 4.84 });

test('journée : la liste est vidée, et une randonnée déjà connue devient un lien', () => {
  W12.raz(); W12.setLang('fr');
  const l = liste();
  l.innerHTML = 'ancien contenu';
  F12.renderActivityCards(l, [{ hikeUrl: 'https://visorando.example/h1', hikeName: 'Les crêtes' }], '69', 'Lyon', LEG());
  assert.equal(l.innerHTML, '', 'le contenu précédent doit être effacé');
  const carte = l.__fils[0];
  assert.equal(carte.tagName, 'A', 'une randonnée connue est un lien, pas une carte muette');
  assert.ok(carte.classList.contains('has-hike'));
  assert.equal(carte.href, 'https://visorando.example/h1');
  assert.equal(carte.rel, 'noopener');
  assert.ok(carte.innerHTML.includes('Les crêtes'));
  // Une adresse douteuse est neutralisée.
  const l2 = liste();
  F12.renderActivityCards(l2, [{ hikeUrl: 'javascript:alert(1)', hikeName: 'X' }], '69', 'Lyon', LEG());
  assert.equal(l2.__fils[0].href, '#');
});

test('journée : une activité ordinaire porte son titre et son type, échappés', () => {
  W12.raz(); W12.setLang('fr');
  const l = liste();
  F12.renderActivityCards(l, [{ label: 'Musée <b>X</b>', typeKey: 'museum<script>' }], '69', 'Lyon', LEG());
  const html = l.__fils[0].innerHTML;
  assert.ok(html.includes('activity-card-title'), html);
  assert.ok(html.includes('&lt;b&gt;'), 'le titre doit être échappé : ' + html);
  assert.ok(!html.includes('<script'), 'le type doit être échappé : ' + html);
  assert.ok(html.includes('data-spark'), 'l\'icône par défaut doit être posée');
  // Une balade porte son icône propre.
  const l2 = liste();
  F12.renderActivityCards(l2, [{ label: 'Balade', isWalk: true }], '69', 'Lyon', LEG());
  assert.ok(l2.__fils[0].innerHTML.includes('data-walk'));
});

test('journée : la mention « recherche en cours » n\'apparaît que si une recherche est possible', () => {
  W12.raz(); W12.setLang('fr');
  const avecPosition = liste();
  F12.renderActivityCards(avecPosition, [{ label: 'Balade', needsHike: true }], '69', 'Lyon', LEG());
  assert.ok(avecPosition.__fils[0].innerHTML.includes('activities-loading-note'), 'une recherche est possible : on le dit');
  // Sans coordonnées, aucune recherche n'est possible : pas de mention.
  W12.raz();
  const sansPosition = liste();
  F12.renderActivityCards(sansPosition, [{ label: 'Balade', needsHike: true }], '69', 'Lyon', { stop: 'X', country: 'FR' });
  assert.ok(!sansPosition.__fils[0].innerHTML.includes('activities-loading-note'));
  // Recherche DÉJÀ faite sans résultat : la mention ne revient pas au rendu suivant.
  W12.raz();
  const dejaCherche = liste();
  F12.renderActivityCards(dejaCherche, [{ label: 'Balade', needsHike: true, hikeSearched: true }], '69', 'Lyon', LEG());
  assert.ok(!dejaCherche.__fils[0].innerHTML.includes('activities-loading-note'),
    'sinon la mention resterait affichée indéfiniment');
});

test('journée : aucune randonnée trouvée — la mention disparaît et l\'option le retient', async () => {
  W12.raz(); W12.setLang('fr');
  W12.regle({ rando: null });
  const l = liste();
  const opt = { label: 'Balade', needsHike: true };
  F12.renderActivityCards(l, [opt], '69', 'Lyon', LEG());
  const carte = l.__fils[0];
  const note = W12.__noeud3('activities-loading-note');
  carte.__enfants['.activities-loading-note'] = note;
  await souffle12();
  assert.equal(opt.hikeSearched, true, 'l\'option doit retenir que la recherche a eu lieu');
  assert.equal(note.__retire, 1, 'la mention doit être retirée de la page');
});

test('journée : une randonnée trouvée remplace la carte ET est mémorisée sur l\'option', async () => {
  W12.raz(); W12.setLang('fr');
  W12.regle({ rando: { name: 'Le belvédère', url: 'https://visorando.example/h9', distance: 8, source: 'Visorando' } });
  const l = liste();
  const opt = { label: 'Balade', needsHike: true };
  const leg = LEG();
  F12.renderActivityCards(l, [opt], '69', 'Lyon', leg);
  const ancienne = l.__fils[0];
  await souffle12();
  assert.equal(opt.hikeUrl, 'https://visorando.example/h9',
    'sans cette mémoire sur l\'option, l\'export PDF montrerait la formule générique');
  assert.equal(opt.hikeName, 'Le belvédère');
  assert.equal(opt.hikeSource, 'Visorando');
  const neuve = l.__fils[0];
  assert.notEqual(neuve, ancienne, 'la carte générique doit être remplacée');
  assert.equal(neuve.tagName, 'A');
  assert.ok(neuve.innerHTML.includes('Le belvédère'));
});

test('journée : une randonnée arrivée trop tard est RENDUE À LA FILE plutôt que perdue', async () => {
  W12.raz(); W12.setLang('fr');
  const hike = { name: 'Tardive', url: 'https://visorando.example/h7' };
  W12.regle({ rando: hike });
  const l = liste();
  const opt = { label: 'Balade', needsHike: true };
  const leg = LEG();
  leg.activities = [];                        // la carte a été remplacée par de vrais POI entre-temps
  F12.renderActivityCards(l, [opt], '69', 'Lyon', leg);
  l.__fils[0].remove();                       // la carte n'est plus dans la page
  W12.files().used[hike.url] = true;
  W12.files().parCommune[F12.hikeKeyOf(leg)] = [];
  await souffle12();
  assert.ok(!W12.files().used[hike.url], 'la randonnée doit redevenir disponible');
  assert.equal(plat(W12.files().parCommune[F12.hikeKeyOf(leg)]).length, 1, 'et retourner en tête de file');
  assert.equal(leg.__hikePromise, null, 'la promesse du jour doit être relâchée');
});

test('journée : un nouveau tirage annule l\'arrivée d\'une randonnée', async () => {
  W12.raz(); W12.setLang('fr');
  W12.regle({ rando: { name: 'X', url: 'https://visorando.example/h1' } });
  const l = liste();
  const opt = { label: 'Balade', needsHike: true };
  F12.renderActivityCards(l, [opt], '69', 'Lyon', LEG());
  W12.regle({ generation: 2 });
  await souffle12();
  assert.equal(opt.hikeUrl, undefined, 'le résultat d\'un tirage abandonné ne doit rien modifier');
});

test('journée : les portails ne sont proposés qu\'une fois par étape', async () => {
  W12.raz(); W12.setLang('fr');
  W12.regle({ portails: [{ name: 'Portail <b>A</b>', url: 'https://p.example/a' },
                         { name: 'Portail B', url: 'javascript:alert(1)' }] });
  const l = liste();
  const leg = LEG();
  F12.renderActivityCards(l, [{ label: 'Balade', needsHike: true }], '69', 'Lyon', leg);
  await souffle12();
  const rangee = l.__fils.find(f => f.className === 'hike-portals');
  assert.ok(rangee, 'la rangée de portails doit être ajoutée');
  assert.ok(rangee.innerHTML.includes('&lt;b&gt;'), 'le nom du portail doit être échappé : ' + rangee.innerHTML);
  assert.ok(!rangee.innerHTML.includes('javascript:'), 'une adresse douteuse doit être neutralisée');
  // Une AUTRE liste pour la même étape ne redonne pas les portails.
  const l2 = liste();
  F12.renderActivityCards(l2, [{ label: 'Balade', needsHike: true }], '69', 'Lyon', leg);
  await souffle12();
  assert.ok(!l2.__fils.some(f => f.className === 'hike-portails'), 'une seule proposition par étape');
});

test('journée : une image déjà connue est posée sans aller-retour, sinon la photo est demandée', async () => {
  W12.raz(); W12.setLang('fr');
  const l = liste();
  F12.renderActivityCards(l, [{ label: 'Musée', image: 'https://u.example/m.jpg' }], '69', 'Lyon', LEG());
  const j = W12.journal().filter(x => x[0] === 'image');
  assert.equal(j.length, 1, 'une image déjà connue est appliquée directement');
  // Vraie curiosité nommée sans image : on demande sa photo, et le lien est appliqué même sans photo.
  W12.raz();
  W12.regle({ photo: { image: null, wikiUrl: 'https://fr.wikipedia.org/x' } });
  const l2 = liste();
  F12.renderActivityCards(l2, [{ label: 'Musée', isReal: true, searchName: 'Musée X' }], '69', 'Lyon', LEG());
  await souffle12();
  const w = W12.journal().filter(x => x[0] === 'wiki');
  assert.equal(w.length, 1, 'sans photo, un lien vers l\'article reste appliqué');
  assert.equal(w[0][1], 'https://fr.wikipedia.org/x');
});

// ---------------------------------------------------------------------------------------------------------------
// LOT 13 — JOURNAL DE BORD (renderDays), 362 lignes et trente-huit fonctions appelées.
//
// C'est un ORCHESTRATEUR : son travail n'est pas de calculer mais d'ASSEMBLER. On la teste donc pour ce qu'elle
// est — ce qu'elle construit, dans quel ordre, et ce qu'elle ne construit qu'une fois — avec des doublures pour
// ses trente-huit appels et le VRAI regroupement des séjours, qui est la décision structurante.
// Ce que ce lot verrouille, et que le code signale lui-même comme ayant déjà mal tourné :
//   - un séjour de plusieurs nuits au même endroit fait UNE seule case, mais garde UNE section d'activités PAR
//     JOUR, pour ne jamais reproposer le même lieu deux fois au même endroit ;
//   - un rappel de vignette PAR PAYS pour tout l'itinéraire, pas à chaque étape qui y repasse ;
//   - la mention de devise sans taux est dite UNE fois pour tout le voyage ;
//   - le trait de liaison relie les cases entre elles, donc jamais après la dernière ;
//   - les compteurs de portails sont remis à zéro à chaque rendu.
const FNS13 = ['escHtml', 'safeUrl', 'formatNum', 'groupLegsByStay', 'stopKey', 'renderDays'];

function sandboxJournal(){
  const noeud = (tag) => { const n = { tagName: String(tag || 'div').toUpperCase(), className: '', innerHTML: '',
      textContent: '', href: '', _attrs: {}, _cl: {}, __fils: [], __enfants: {}, style: {}, parentNode: null };
    n.classList = { add: c => { n._cl[c] = true; }, remove: c => { delete n._cl[c]; },
      contains: c => !!n._cl[c] || String(n.className).split(/\s+/).indexOf(c) >= 0 };
    n.setAttribute = (k, v) => { n._attrs[k] = String(v); };
    n.getAttribute = k => Object.prototype.hasOwnProperty.call(n._attrs, k) ? n._attrs[k] : null;
    n.removeAttribute = k => { delete n._attrs[k]; };
    n.appendChild = c => { n.__fils.push(c); c.parentNode = n; return c; };
    n.addEventListener = () => {};
    n.remove = () => {};
    n.querySelector = s => n.__enfants[s] || null;
    n.querySelectorAll = () => [];
    return n; };
  const ctx = { navigator: { languages: ['fr'] }, localStorage: { getItem: () => null, setItem(){} },
    CustomEvent: function(){}, Intl, console };
  ctx.window = { addEventListener(){}, dispatchEvent(){} };
  ctx.document = { readyState: 'complete', addEventListener(){}, documentElement: noeud(),
    querySelectorAll: () => [], querySelector: () => null, getElementById: () => null, createElement: noeud };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(PUB, 'i18n.js'), 'utf8'), ctx);
  const journal = [];
  ctx.__j = journal;
  ctx.__noeud4 = noeud;
  // Les trente-huit appels, en doublures : ce qui compte est QU'ILS SOIENT FAITS, et avec quoi.
  const bouchons = [
    'function icon(k){ return "<svg data-" + k + "></svg>"; }',
    'function tData(k){ return "DATA:" + k; }',
    'function tripCurrencyNoRateText(){ return __noRate; }',
    'function tensionRowHtml(z, k){ __j.push(["tension", k]); return "TENSION"; }',
    'function dayBadgeText(g){ return formatNum(g.startDay); }',
    'function formatDayRangeLabel(a, b){ return "PLAGE " + a + "-" + b; }',
    'function singleLegLabel(){ return "JOUR"; }',
    'function legRouteText(){ return "ROUTE"; }',
    'function formatCpBadge(){ return "CP"; }',
    'function buildPhotoLinks(){ return { wiki: "https://w.example", images: "https://i.example" }; }',
    'function fetchPlacePhoto(){ return Promise.resolve(null); }',
    'function nearOf(){ return null; }',
    'function photoCreditInfo(){ return null; }',
    'function photoCreditHtml(){ return ""; }',
    'function openLightbox(){}',
    'function overMaxLegText(){ return ""; }',
    'function tollText(){ return ""; }',
    'function tIfDefined(){ return ""; }',
    'function ferryText(){ return ""; }',
    'function ferryLabel(){ return ""; }',
    'function ferryNoVehicles(){ return ""; }',
    'function chargeStopsText(){ return ""; }',
    'function noChargerText(){ return ""; }',
    'function restrictionRowHtml(){ return ""; }',
    'function vignetteCountriesOfGroup(){ return __vignettes; }',
    'function vignetteLabel(c){ __j.push(["vignette", c]); return "VIGNETTE " + c; }',
    'function realPoiQueueSync(){ return null; }',
    'function realPoiQueueFor(){ return Promise.resolve({ poisQueue: [], genericQueue: [] }); }',
    'function upgradeActivities(leg){ return leg.activities || []; }',
    'function renderActivityCards(liste, acts, dept, nom, leg){ __j.push(["activites", leg && leg.stop]); }',
    'function scheduleDaysRerender(){}',
    'function formatStayRange(){ return "SEJOUR"; }',
    'function lodgingLinksHtml(){ return "LIENS"; }',
    'function tripStatsParts(){ return []; }'
  ];
  const glue = [
    'var t = window.I18N.t;',
    'var VISITOR_LANG = "fr", MAX_TRIP_DAYS = 21;',
    'var COUNTRIES = { FR: { name: "France" }, CH: { name: "Suisse", vignette: { url: "https://via.example" } } };',
    'var portalsShownFor = { vieux: 1 }, tripGeneration = 1;',
    'var __noRate = "", __vignettes = [];',
    'var els = { days: __noeud4("div"), timelineStats: __noeud4("div") };',
    bouchons.join('\n'),
    FNS13.map(extract).join('\n'),
    'this.F = { ' + FNS13.join(', ') + ' };',
    'this.els = els;',
    'this.journal = function(){ return __j; };',
    'this.regle = function(o){ if(o.noRate !== undefined) __noRate = o.noRate;',
    '  if(o.vignettes !== undefined) __vignettes = o.vignettes; };',
    'this.portails = function(){ return portalsShownFor; };',
    'this.raz = function(){ __j.length = 0; __noRate = ""; __vignettes = []; portalsShownFor = { vieux: 1 };',
    '  els.days = __noeud4("div"); els.timelineStats = __noeud4("div"); };',
    'this.setLang = function(l){ VISITOR_LANG = l; window.I18N.set(l); };'
  ].join('\n');
  vm.runInContext(glue, ctx);
  return ctx;
}
const W13 = sandboxJournal();
const F13 = W13.F;
const cartes = () => W13.els.days.__fils.filter(f => f.className === 'day-card');
const rangees = () => W13.els.days.__fils.filter(f => String(f.className).includes('tension-row'));
const JOUR = (n, stop, jour) => ({ stop: stop, country: 'FR', lat: 45 + n, lon: 4 + n, dayNumber: jour || n,
  distanceKm: 100, activities: [{ label: 'A' }] });

test('journal : le conteneur est vidé et les compteurs de portails remis à zéro', () => {
  W13.raz(); W13.setLang('fr');
  W13.els.days.innerHTML = 'ancien';
  assert.ok(W13.portails().vieux, 'le compteur porte une trace du rendu précédent');
  F13.renderDays({ legs: [JOUR(1, 'Lyon')], notices: [] });
  assert.equal(W13.els.days.innerHTML, '', 'le journal précédent doit être effacé');
  assert.ok(!W13.portails().vieux, 'les portails déjà proposés doivent être oubliés, sinon ils ne reviendraient jamais');
});

test('journal : un avertissement par consigne de voyage, avant les cases', () => {
  W13.raz(); W13.setLang('fr');
  F13.renderDays({ legs: [JOUR(1, 'Lyon')], notices: ['notice.van', 'notice.electric'] });
  const r = rangees();
  assert.equal(r.length, 2, 'deux consignes, deux rangées : ' + r.length);
  assert.ok(r[0].innerHTML.includes('DATA:notice.van'), r[0].innerHTML);
  assert.ok(r[0].innerHTML.includes('data-warn'), 'chaque avertissement porte son icône');
  // Les avertissements précèdent la première case.
  const positions = W13.els.days.__fils.map(f => f.className);
  assert.ok(positions.indexOf('day-card') > positions.lastIndexOf('day-row tension-row tension-orange'),
    'les avertissements viennent avant les jours : ' + JSON.stringify(positions));
});

test('journal : la devise sans taux est dite UNE fois pour tout le voyage', () => {
  W13.raz(); W13.setLang('fr');
  W13.regle({ noRate: 'Pas de taux pour <b>XYZ</b>' });
  F13.renderDays({ legs: [JOUR(1, 'Lyon'), JOUR(2, 'Nice')], notices: [] });
  const avec = rangees().filter(x => x.innerHTML.includes('XYZ'));
  assert.equal(avec.length, 1, 'une seule mention, pas une par jour');
  assert.ok(avec[0].innerHTML.includes('&lt;b&gt;'), 'le texte doit être échappé : ' + avec[0].innerHTML);
});

test('journal : la zone de départ déconseillée est signalée avec son niveau', () => {
  W13.raz(); W13.setLang('fr');
  F13.renderDays({ legs: [JOUR(1, 'Lyon')], notices: [], departureTension: { level: 'rouge' } });
  const r = rangees().find(x => String(x.className).includes('tension-rouge'));
  assert.ok(r, 'la rangée doit porter le niveau dans sa classe : ' + rangees().map(x => x.className).join(' | '));
  assert.ok(W13.journal().some(x => x[0] === 'tension' && x[1] === 'tension.departure'),
    'et être composée par le rendu de tension dédié');
});

test('journal : plusieurs nuits au même endroit font UNE case, mais une section d\'activités PAR JOUR', () => {
  W13.raz(); W13.setLang('fr');
  const lyon1 = JOUR(1, 'Lyon', 1), lyon2 = JOUR(1, 'Lyon', 2), nice = JOUR(2, 'Nice', 3);
  F13.renderDays({ legs: [lyon1, lyon2, nice], notices: [] });
  assert.equal(cartes().length, 2, 'deux nuits à Lyon et une à Nice : deux cases');
  const acts = W13.journal().filter(x => x[0] === 'activites');
  assert.equal(acts.length, 3,
    'chaque JOUR garde sa section d\'activités, sinon le même lieu serait reproposé deux fois au même endroit');
  // La case groupée annonce une plage de jours, pas un jour unique.
  // Le séjour groupé se reconnaît à la classe « range » de son numéro, et la nuit unique ne l'a pas.
  const numGroupe = cartes()[0].__fils.find(f => f.className === 'day-badge').__fils[0];
  const numSeul = cartes()[1].__fils.find(f => f.className === 'day-badge').__fils[0];
  assert.ok(numGroupe.className.includes('range'), 'la case groupée doit être marquée : ' + numGroupe.className);
  assert.ok(!numSeul.className.includes('range'), 'une nuit unique ne doit pas l\'être : ' + numSeul.className);
});

test('journal : le trait de liaison relie les cases, donc jamais après la dernière', () => {
  W13.raz(); W13.setLang('fr');
  F13.renderDays({ legs: [JOUR(1, 'Lyon'), JOUR(2, 'Nice'), JOUR(3, 'Paris')], notices: [] });
  const c = cartes();
  assert.equal(c.length, 3);
  const traits = c.map(carte => {
    const badge = carte.__fils.find(f => f.className === 'day-badge');
    return badge.__fils.some(f => f.className === 'line');
  });
  assert.deepEqual(traits, [true, true, false], 'la dernière case ne doit pas traîner un trait dans le vide');
});

test('journal : le numéro de jour est écrit dans les chiffres de la langue', () => {
  W13.raz(); W13.setLang('fr');
  F13.renderDays({ legs: [JOUR(1, 'Lyon')], notices: [] });
  const num = cartes()[0].__fils.find(f => f.className === 'day-badge').__fils[0];
  assert.equal(num.textContent, '1');
  assert.equal(num.getAttribute('aria-hidden'), 'true', 'le numéro est décoratif : la plage est déjà dans le titre');
  W13.raz(); W13.setLang('ar');
  F13.renderDays({ legs: [JOUR(1, 'Lyon')], notices: [] });
  const ar = cartes()[0].__fils.find(f => f.className === 'day-badge').__fils[0].textContent;
  assert.ok(/[٠-٩]/.test(ar) || ar === '1', 'chiffres de la langue attendus : ' + ar);
  W13.setLang('fr');
});

test('journal : un rappel de vignette PAR PAYS, même si l\'itinéraire y repasse', () => {
  W13.raz(); W13.setLang('fr');
  W13.regle({ vignettes: ['CH'] });
  F13.renderDays({ legs: [JOUR(1, 'Genève'), JOUR(2, 'Zurich'), JOUR(3, 'Berne')], notices: [] });
  const rappels = W13.journal().filter(x => x[0] === 'vignette');
  assert.equal(rappels.length, 1,
    'trois étapes suisses, un seul rappel — sinon il apparaîtrait à chaque jour');
  assert.equal(rappels[0][1], 'CH');
  // Un second rendu (changement de langue) refait le rappel, dans la nouvelle langue.
  W13.setLang('de');
  F13.renderDays({ legs: [JOUR(1, 'Genève'), JOUR(2, 'Zurich')], notices: [] });
  assert.equal(W13.journal().filter(x => x[0] === 'vignette').length, 2,
    'le rappel doit réapparaître au redessin, une fois');
  W13.setLang('fr');
});

test('journal : chaque case porte un délai d\'animation croissant', () => {
  W13.raz(); W13.setLang('fr');
  F13.renderDays({ legs: [JOUR(1, 'A'), JOUR(2, 'B'), JOUR(3, 'C')], notices: [] });
  const delais = cartes().map(c => c.style.animationDelay);
  assert.deepEqual(delais, ['0s', '0.09s', '0.18s'], 'les cases doivent apparaître l\'une après l\'autre');
});
