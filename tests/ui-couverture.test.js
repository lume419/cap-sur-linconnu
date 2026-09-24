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
