// Construit FERRY_PORTS dans public/js/trip-data.js à partir de scripts/ferry-ports/ports-*.js : coordonnées des
// villes portuaires de chaque rive de chaque liaison (FERRY_ROUTES, SEA_CROSSINGS). Le moteur s'en sert pour estimer la
// partie par la route d'un trajet avec traversée (jusqu'au port de départ le plus proche, puis depuis le port d'arrivée
// le plus proche) : sans elle, un trajet à vélo pouvait franchir la mer vers n'importe quel lieu de l'autre rive.
//
// Chaque fichier source exporte un tableau :
//   { key: 'continental|corsica', source: 'URL ou référence des lignes exploitées',
//     ports: { continental: [ { cc: 'FR', place: 'Marseille' }, … ], corsica: [ { cc: 'FR', place: 'Ajaccio' }, … ] } }
// - cc : pays du fichier de lieux (ES pour Ceuta et Melilla, RU pour Kaliningrad) ; place : nom du lieu tel qu'il
//   figure dans public/data (voir scripts/ferry-ports/find-port.js) ;
// - near: [lat, lon] (facultatif) : lève une homonymie, le lieu retenu est le plus proche (30 km au plus).
// Les coordonnées viennent TOUJOURS des données de lieux du projet (GeoNames et sources nationales), jamais saisies à
// la main ; le port est approché par le centre de sa localité.
//
// Contrôles (refus en cas d'erreur, rien n'est écrit) : liaison existante, deux rives renseignées, lieu trouvé dans le
// pays indiqué, lieu situé sur la bonne masse terrestre (landmassOf) — ou dans la bonne zone (zoneOf) pour SEA_CROSSINGS —,
// homonymes éloignés refusés sans near.
//
//   node scripts/build-ferry-ports.js            vérifie et écrit (liaisons sans ports signalées)
//   node scripts/build-ferry-ports.js --check    vérifie sans écrire
//   node scripts/build-ferry-ports.js --only ports-europe.js --check
//   node scripts/build-ferry-ports.js --strict   refuse aussi s'il manque des liaisons
const fs = require('fs');
const path = require('path');
const TripData = require('../public/js/trip-data.js');
const { internals } = require('../lib/trip-engine.js');

const SRC = path.join(__dirname, 'ferry-ports');
const TRIP_DATA = path.join(__dirname, '..', 'public', 'js', 'trip-data.js');
const args = process.argv.slice(2);
const CHECK = args.includes('--check'), STRICT = args.includes('--strict');
const onlyIdx = args.indexOf('--only');
const ONLY = onlyIdx >= 0 ? args[onlyIdx + 1] : null;

const hv = (a, b, c, d) => { const r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
const placesCache = {};
function placesOf(cc){
  if(!placesCache[cc]){
    const file = path.join(__dirname, '..', 'public', 'data', TripData.COUNTRIES[cc].file);
    const byNorm = new Map();
    internals.parseCommunesFile(fs.readFileSync(file, 'utf8'), cc).forEach(p => {
      if(!byNorm.has(p.norm)) byNorm.set(p.norm, []);
      byNorm.get(p.norm).push(p);
    });
    placesCache[cc] = byNorm;
  }
  return placesCache[cc];
}

const errors = [], entries = {};
const files = fs.readdirSync(SRC).filter(f => /^ports-.+\.js$/.test(f) && (!ONLY || f === ONLY)).sort();
for(const f of files){
  const list = require(path.join(SRC, f));
  if(!Array.isArray(list)){ errors.push(f + ' : le fichier doit exporter un tableau'); continue; }
  list.forEach((e, i) => {
    const at = f + '[' + i + '] ' + (e && e.key);
    const kind = TripData.FERRY_ROUTES[e.key] ? 'ferry' : TripData.SEA_CROSSINGS[e.key] ? 'sea' : null;
    if(!kind) return errors.push(at + ' : liaison inconnue');
    if(entries[e.key]) return errors.push(at + ' : liaison déjà renseignée dans ' + entries[e.key].file);
    if(!e.source || String(e.source).length < 8) errors.push(at + ' : source manquante');
    const out = { file: f, sides: {} };
    for(const side of e.key.split('|')){
      const ports = e.ports && e.ports[side];
      if(!Array.isArray(ports) || !ports.length){ errors.push(at + ' : aucun port pour la rive « ' + side + ' »'); continue; }
      out.sides[side] = [];
      ports.forEach(port => {
        const pat = at + ' ' + side + ' ' + (port && port.cc) + ' ' + (port && port.place);
        if(!port || !TripData.COUNTRIES[port.cc]) return errors.push(pat + ' : pays inconnu');
        if(!port.place) return errors.push(pat + ' : place manquant');
        const sideOf = p => kind === 'sea' ? internals.zoneOf(p) : internals.landmassOf(p);
        const all = placesOf(port.cc).get(internals.normalizeCityName(port.place)) || [];
        let cands = all.filter(p => sideOf(p) === side);
        if(!cands.length){
          return errors.push(pat + ' : ' + (all.length ? 'lieu hors de la rive (' + [...new Set(all.map(sideOf))].join(', ') + ')' : 'lieu introuvable'));
        }
        let chosen;
        if(port.near){
          cands = cands.map(p => ({ p, km: hv(port.near[0], port.near[1], p.lat, p.lon) })).sort((a, b) => a.km - b.km);
          if(cands[0].km > 30) return errors.push(pat + ' : aucun lieu de ce nom à moins de 30 km de near');
          chosen = cands[0].p;
        } else if(cands.length === 1){
          chosen = cands[0];
        } else {
          let spread = 0;
          cands.forEach(a => cands.forEach(b => { spread = Math.max(spread, hv(a.lat, a.lon, b.lat, b.lon)); }));
          if(spread > 20) return errors.push(pat + ' : ' + cands.length + ' homonymes sur cette rive, préciser near');
          chosen = cands.slice().sort((a, b) => (b.pop || 0) - (a.pop || 0))[0];
        }
        const ll = [Math.round(chosen.lat * 1e4) / 1e4, Math.round(chosen.lon * 1e4) / 1e4];
        if(!out.sides[side].some(x => x[0] === ll[0] && x[1] === ll[1])) out.sides[side].push(ll);
      });
    }
    entries[e.key] = out;
  });
}

const allKeys = Object.keys(TripData.FERRY_ROUTES).concat(Object.keys(TripData.SEA_CROSSINGS));
const missing = ONLY ? [] : allKeys.filter(k => !entries[k]);
if(errors.length){
  console.error('REFUS (' + errors.length + ' erreurs) :\n  ' + errors.join('\n  '));
  process.exit(1);
}
const portCount = Object.values(entries).reduce((n, e) => n + Object.values(e.sides).reduce((m, s) => m + s.length, 0), 0);
console.log(Object.keys(entries).length + ' liaisons, ' + portCount + ' ports' + (ONLY ? ' (' + ONLY + ')' : '') +
  (missing.length ? ' ; ' + missing.length + ' liaisons sans ports : ' + missing.slice(0, 20).join(' ') + (missing.length > 20 ? '…' : '') : ''));
if(STRICT && missing.length){ console.error('REFUS : liaisons sans ports (--strict)'); process.exit(1); }
if(CHECK || ONLY) process.exit(0);

const body = allKeys.filter(k => entries[k]).map(k => {
  const s = entries[k].sides;
  return "      '" + k + "': { " + Object.keys(s).map(side => "'" + side + "': " + JSON.stringify(s[side])).join(', ') + ' }';
}).join(',\n');
const block = '    // BEGIN AUTO FERRY PORTS (scripts/build-ferry-ports.js)\n' +
  '    // Villes portuaires de chaque rive (coordonnées des données de lieux, voir scripts/ferry-ports/) : partie par la\n' +
  '    // route d\'un trajet avec traversée, estimée jusqu\'au port le plus proche de chaque rive.\n' +
  '    var FERRY_PORTS = {\n' + body + '\n    };\n' +
  '    // END AUTO FERRY PORTS';
const src = fs.readFileSync(TRIP_DATA, 'utf8');
if(!/\/\/ BEGIN AUTO FERRY PORTS[\s\S]*?\/\/ END AUTO FERRY PORTS/.test(src)){ console.error('marqueurs AUTO FERRY PORTS absents de trip-data.js'); process.exit(1); }
fs.writeFileSync(TRIP_DATA, src.replace(/    \/\/ BEGIN AUTO FERRY PORTS[\s\S]*?\/\/ END AUTO FERRY PORTS/, block));
console.log('écrit dans ' + TRIP_DATA);
