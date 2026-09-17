// Injecte les plateformes d'hébergement par pays dans public/js/trip-data.js (entre les marqueurs « BEGIN/END AUTO
// LODGING RULES »), à partir de scripts/lodging/lodging-*.js (recherche sourcée, septembre 2026).
// Pour chaque pays listé : statut d'Airbnb et de Booking.com (ok / limited / absent) et plateformes locales réelles avec
// un modèle d'URL de recherche vérifié ({town}, {checkin}, {checkout}, {adults}). Un pays absent de la liste garde les
// deux liens habituels. Validation stricte : refus d'écrire en cas d'entrée incomplète.
const fs = require('fs');
const path = require('path');
const { COUNTRIES } = require('../public/js/trip-data.js');

const TRIP_DATA = path.join(__dirname, '..', 'public', 'js', 'trip-data.js');
const DIR = path.join(__dirname, 'lodging');
const STATUSES = ['ok', 'limited', 'absent'];
const TYPES = ['hotels', 'rentals', 'both'];
const errors = [];
const check = (cond, msg) => { if(!cond) errors.push(msg); };

const rules = {};
for(const f of fs.readdirSync(DIR).filter(f => /^lodging-.+\.js$/.test(f)).sort()){
  for(const r of require(path.join(DIR, f))){
    const at = f + ' ' + r.country;
    check(COUNTRIES[r.country], at + ' : pays inconnu');
    check(!rules[r.country], at + ' : pays en double');
    check(STATUSES.includes(r.airbnb) && STATUSES.includes(r.booking), at + ' : statut');
    check((r.airbnb === 'ok' && r.booking === 'ok') || /^https?:\/\//.test(r.statusSource || ''), at + ' : source du statut');
    const local = (r.local || []).map((l, i) => {
      const lat = at + ' local[' + i + '] ' + (l.name || '?');
      check(l.name && String(l.name).length <= 40, lat + ' : nom');
      check(/^https:\/\/[^\s<>"']+$/.test(l.url || ''), lat + ' : url https');
      check(TYPES.includes(l.type), lat + ' : type');
      check(!l.searchByUrl || /\{town\}/.test(l.url), lat + ' : {town} manquant');
      check((String(l.url).match(/\{(\w+)\}/g) || []).every(p => ['{town}', '{checkin}', '{checkout}', '{adults}'].includes(p)), lat + ' : espace réservé inconnu');
      check(l.verified, lat + ' : vérification');
      return { name: l.name, url: l.url, type: l.type };
    });
    check(local.length || r.airbnb !== 'absent' || r.booking !== 'absent' || r.noPlatform, at + ' : aucune plateforme');
    rules[r.country] = { airbnb: r.airbnb, booking: r.booking, local: local };
  }
}
if(errors.length){ console.error('REFUS :\n  ' + errors.join('\n  ')); process.exit(1); }

let src = fs.readFileSync(TRIP_DATA, 'utf8');
const begin = src.indexOf('// BEGIN AUTO LODGING RULES'), end = src.indexOf('// END AUTO LODGING RULES');
if(begin < 0 || end < 0) throw new Error('marqueurs absents de trip-data.js');
const lineStart = src.lastIndexOf('\n', begin) + 1;
const indent = src.slice(lineStart, begin);
const body = indent + '// BEGIN AUTO LODGING RULES\n' + indent + 'var LODGING_RULES = {\n' +
  Object.keys(rules).sort().map(cc => indent + '  ' + cc + ': ' + JSON.stringify(rules[cc])).join(',\n') + '\n' + indent + '};\n' + indent;
src = src.slice(0, lineStart) + body + src.slice(end);
fs.writeFileSync(TRIP_DATA, src);
const count = s => Object.values(rules).filter(r => r.airbnb === s || r.booking === s).length;
console.log(Object.keys(rules).length + ' pays ; absent ' + count('absent') + ', limité ' + count('limited') + ' ; ' +
  Object.values(rules).reduce((n, r) => n + r.local.length, 0) + ' plateformes locales');
