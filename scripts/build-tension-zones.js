// Construit TENSION_ZONES dans public/js/trip-data.js à partir des fichiers scripts/tension-zones/*.js.
//
// Chaque fichier source exporte une liste de règles relevées sur France Diplomatie (Conseils aux
// voyageurs), rubrique « Sécurité » de chaque pays : zones ROUGES (« formellement déconseillé ») et
// ORANGE (« déconseillé sauf raison impérative ») ; le jaune et le vert sont ignorés.
//
//   { country, level: 'red'|'orange', label, match, except?, source, date }
//
// Types de `match` / `except` (voir matchTension dans lib/trip-engine.js) :
//   { all: true } · { regions: [libellés exacts du champ région] } · { cpPrefix: [...] }
//   { borderKm: N, with: 'XX' } · { near: [{ name, lat, lon, km }] }
//
// Le script VÉRIFIE avant d'écrire, et s'arrête à la moindre erreur :
//   - pays connu de COUNTRIES, niveau valide, source présente ;
//   - chaque libellé de `regions` existe réellement dans le fichier de lieux du pays ;
//   - chaque `cpPrefix` couvre au moins un lieu ;
//   - chaque `borderKm.with` est un pays couvert.
// Il affiche ensuite, par pays, le nombre de lieux rouges et orange obtenus.
//
// Relancer après toute mise à jour des avis, puis scripts/build-data-bundles.js n'est PAS nécessaire
// (les zones sont évaluées au démarrage du serveur, sur les lieux déjà chargés) ; redémarrer le serveur.

const fs = require('fs');
const path = require('path');
const TripData = require('../public/js/trip-data.js');

const SRC_DIR = path.join(__dirname, 'tension-zones');
const TRIP_DATA = path.join(__dirname, '..', 'public', 'js', 'trip-data.js');

const rules = [];
fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.js')).sort().forEach(f => {
  require(path.join(SRC_DIR, f)).forEach(r => rules.push(Object.assign({ _file: f }, r)));
});

const placesCache = {};
function places(cc){
  if(!placesCache[cc]){
    const file = path.join(__dirname, '..', 'public', 'data', TripData.COUNTRIES[cc].file);
    placesCache[cc] = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => {
      const p = l.split(';'); const ll = p[1].split(',');
      return { cps: p[2].split(','), dept: p[3], lon: parseFloat(ll[0]), lat: parseFloat(ll[1]), name: p[4] };
    });
  }
  return placesCache[cc];
}

const errors = [];
function checkMatch(m, r, where){
  const keys = Object.keys(m || {});
  if(keys.length === 0) return errors.push(r._file + ' ' + r.country + ' : ' + where + ' vide');
  if(m.regions){
    const known = new Set(places(r.country).map(p => p.dept));
    m.regions.forEach(x => { if(!known.has(x)) errors.push(r._file + ' ' + r.country + ' : région inconnue « ' + x + ' » (' + where + ')'); });
  }
  if(m.cpPrefix){
    m.cpPrefix.forEach(x => { if(!places(r.country).some(p => p.cps.some(cp => cp.indexOf(x) === 0))) errors.push(r._file + ' ' + r.country + ' : cpPrefix sans lieu « ' + x + ' » (' + where + ')'); });
  }
  if(m.borderKm && !TripData.COUNTRIES[m.with]) errors.push(r._file + ' ' + r.country + ' : borderKm avec pays non couvert « ' + m.with + ' »');
  if(m.near) m.near.forEach(n => { if(!isFinite(n.lat) || !isFinite(n.lon) || !(n.km > 0)) errors.push(r._file + ' ' + r.country + ' : near invalide ' + JSON.stringify(n)); });
}
rules.forEach(r => {
  if(!TripData.COUNTRIES[r.country]) return errors.push(r._file + ' : pays inconnu ' + r.country);
  if(r.level !== 'red' && r.level !== 'orange') errors.push(r._file + ' ' + r.country + ' : niveau invalide');
  if(!r.source) errors.push(r._file + ' ' + r.country + ' : source manquante');
  checkMatch(r.match, r, 'match');
  if(r.except) checkMatch(r.except, r, 'except');
});
if(errors.length){
  console.log('ERREURS (' + errors.length + ') — rien n\'est écrit :\n' + errors.join('\n'));
  process.exit(1);
}

const out = rules.map(r => {
  const o = { country: r.country, level: r.level, label: r.label, match: r.match };
  if(r.except) o.except = r.except;
  o.source = r.source; o.date = r.date;
  return '      ' + JSON.stringify(o);
});
let s = fs.readFileSync(TRIP_DATA, 'utf8');
const re = /var TENSION_ZONES = \[[\s\S]*?\n?\s*\];/;
if(!re.test(s)) throw new Error('var TENSION_ZONES introuvable dans trip-data.js');
s = s.replace(re, () => 'var TENSION_ZONES = [\n' + out.join(',\n') + '\n    ];');
fs.writeFileSync(TRIP_DATA, s);
console.log(rules.length + ' règles écrites pour ' + new Set(rules.map(r => r.country)).size + ' pays.');
