// Injecte les restrictions de circulation des vans et des motos dans public/js/trip-data.js (entre les marqueurs
// « BEGIN/END AUTO TRANSPORT RULES »), à partir de scripts/transport/van-rules.js et moto-rules.js (septembre 2026).
// Valide chaque entrée (type connu, pays couvert, coordonnées, rayon, source en http(s), date) et refuse d'écrire sinon.
// Seuls les champs utiles au moteur et à l'affichage sont gardés (le détail en français reste dans les fichiers sources).
const fs = require('fs');
const path = require('path');
const { COUNTRIES } = require('../public/js/trip-data.js');

const TRIP_DATA = path.join(__dirname, '..', 'public', 'js', 'trip-data.js');
const VAN = require('./transport/van-rules.js');
const MOTO = require('./transport/moto-rules.js');
const errors = [];
function check(cond, msg){ if(!cond) errors.push(msg); }
function validNear(n){ return n && isFinite(n.lat) && isFinite(n.lon) && Math.abs(n.lat) <= 90 && Math.abs(n.lon) <= 180 && n.km > 0 && n.km <= 200; }

const van = VAN.map((r, i) => {
  const at = 'van[' + i + '] ' + (r.name || '?');
  check(['lez', 'ztl', 'tunnel', 'pass', 'road'].includes(r.type), at + ' : type ' + r.type);
  check(COUNTRIES[r.country], at + ' : pays ' + r.country);
  check(r.name, at + ' : nom');
  check(validNear(r.near), at + ' : near');
  check(/^https?:\/\//.test(r.source || ''), at + ' : source'); // http accepté : quelques sites officiels n'ont pas de https (Grenade)
  check(/^\d{4}-\d{2}-\d{2}$/.test(r.date || ''), at + ' : date');
  return { type: r.type, country: r.country, name: r.name, near: { lat: +(+r.near.lat).toFixed(4), lon: +(+r.near.lon).toFixed(4), km: +r.near.km }, source: r.source };
});
const moto = MOTO.map((r, i) => {
  const at = 'moto[' + i + '] ' + (r.name || r.country || '?');
  check(['noMotorway', 'cityBan'].includes(r.type), at + ' : type ' + r.type);
  check(COUNTRIES[r.country], at + ' : pays ' + r.country);
  check(/^https:\/\//.test(r.source || ''), at + ' : source');
  check(/^\d{4}-\d{2}-\d{2}$/.test(r.date || ''), at + ' : date');
  if(r.type === 'cityBan'){
    check(r.name && validNear(r.near), at + ' : nom / near');
    return { type: 'cityBan', country: r.country, name: r.name, near: { lat: +(+r.near.lat).toFixed(4), lon: +(+r.near.lon).toFixed(4), km: +r.near.km }, source: r.source };
  }
  check(r.minCc == null || (Number.isFinite(r.minCc) && r.minCc > 0), at + ' : minCc');
  check(!r.near || validNear(r.near), at + ' : near');
  const out = { type: 'noMotorway', country: r.country, minCc: r.minCc == null ? null : r.minCc, source: r.source };
  // Règle partielle (quelques voies rapides seulement), éventuellement localisée.
  if(r.partial){
    out.partial = true;
    if(r.near) out.near = { lat: +(+r.near.lat).toFixed(4), lon: +(+r.near.lon).toFixed(4), km: +r.near.km };
  }
  return out;
});
const dupNational = moto.filter(r => r.type === 'noMotorway' && !r.partial).map(r => r.country).filter((c, i, a) => a.indexOf(c) !== i);
check(!dupNational.length, 'moto : plusieurs règles nationales pour ' + dupNational.join(', '));

if(errors.length){ console.error('REFUS :\n  ' + errors.join('\n  ')); process.exit(1); }

let src = fs.readFileSync(TRIP_DATA, 'utf8');
const begin = src.indexOf('// BEGIN AUTO TRANSPORT RULES'), end = src.indexOf('// END AUTO TRANSPORT RULES');
if(begin < 0 || end < 0) throw new Error('marqueurs absents de trip-data.js');
const lineStart = src.lastIndexOf('\n', begin) + 1;
const indent = src.slice(lineStart, begin);
const body = indent + '// BEGIN AUTO TRANSPORT RULES\n' +
  indent + 'var VAN_RULES = [\n' + van.map(r => indent + '  ' + JSON.stringify(r)).join(',\n') + '\n' + indent + '];\n' +
  indent + 'var MOTO_RULES = [\n' + moto.map(r => indent + '  ' + JSON.stringify(r)).join(',\n') + '\n' + indent + '];\n' + indent;
src = src.slice(0, lineStart) + body + src.slice(end);
fs.writeFileSync(TRIP_DATA, src);
const byType = a => a.reduce((o, r) => (o[r.type] = (o[r.type] || 0) + 1, o), {});
console.log('van : ' + van.length + ' ' + JSON.stringify(byType(van)) + ' ; moto : ' + moto.length + ' ' + JSON.stringify(byType(moto)));
