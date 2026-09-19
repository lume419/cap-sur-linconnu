// Construit FERRY_PORTS dans lib/ferry-ports.js à partir de scripts/ferry-ports/ports-*.js : coordonnées des
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
// - quay: { osm: 'node/123', lat, lon } (facultatif) : terminal ferry OpenStreetMap (amenity=ferry_terminal ou extrémité
//   d'une route=ferry) quand le centre de la localité est loin du quai ; coordonnées recopiées de l'élément cité, contrôlées
//   (60 km au plus de la localité, même rive). Sans localité dans les données : name + quay, rive contrôlée sur le quai ;
//   sideNote justifie un quai que landmassOf ne range pas sur la rive (données de lieux trop clairsemées).
// - pairs: [['Marseille', 'Ajaccio'], …] (facultatif, au niveau de la liaison) : paires de ports réellement desservies,
//   dans l'ordre des rives de la clé.
// Sans quay, les coordonnées sont celles des données de lieux du projet (GeoNames et sources nationales), jamais saisies
// à la main ; le port est alors approché par le centre de sa localité.
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
const FERRY_PORTS_FILE = path.join(__dirname, '..', 'lib', 'ferry-ports.js');
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
const raw = [];
for(const f of files){
  const list = require(path.join(SRC, f));
  if(!Array.isArray(list)){ errors.push(f + ' : le fichier doit exporter un tableau'); continue; }
  list.forEach((e, i) => raw.push({ f, i, e: JSON.parse(JSON.stringify(e)) }));
}
// Corrections (scripts/ferry-ports/corrections.js), appliquées après les lots : nouvelles liaisons, ports retirés ou
// ajoutés, quais OpenStreetMap, paires desservies. Chaque correction doit viser exactement un port ou une liaison existants.
if(!ONLY && fs.existsSync(path.join(SRC, 'corrections.js'))){
  const C = require(path.join(SRC, 'corrections.js'));
  (C.routes || []).forEach((e, i) => raw.push({ f: 'corrections.js (routes)', i, e: JSON.parse(JSON.stringify(e)) }));
  const entryOf = key => { const r = raw.find(x => x.e.key === key); if(!r) errors.push('corrections : liaison absente ' + key); return r && r.e; };
  const portsOf = (key, side) => {
    const e = entryOf(key), list = e && e.ports && e.ports[side];
    if(e && !list) errors.push('corrections : rive absente ' + key + ' ' + side);
    return list;
  };
  const findPort = (c, label) => {
    const list = portsOf(c.key, c.side);
    if(!list) return -1;
    const idx = list.map((p, n) => (p.place || p.name) === label ? n : -1).filter(n => n >= 0);
    if(idx.length !== 1) errors.push('corrections : ' + idx.length + ' port(s) « ' + label + ' » pour ' + c.key + ' ' + c.side);
    return idx.length === 1 ? idx[0] : -1;
  };
  (C.remove || []).forEach(c => {
    if(!c.reason) errors.push('corrections : retrait sans raison ' + c.place);
    const n = findPort(c, c.place);
    if(n >= 0) portsOf(c.key, c.side).splice(n, 1);
  });
  (C.add || []).forEach(c => {
    if(!c.source) errors.push('corrections : ajout sans source ' + (c.port && c.port.place));
    const list = portsOf(c.key, c.side);
    if(list) list.push(c.port);
  });
  (C.quays || []).forEach(c => {
    const n = findPort(c, c.place || c.name);
    if(n < 0) return;
    const port = portsOf(c.key, c.side)[n];
    port.quay = c.quay;
    if(c.sideNote) port.sideNote = c.sideNote;
  });
  Object.entries(C.pairs || {}).forEach(([key, v]) => { const e = entryOf(key); if(e) e.pairs = v.pairs; });
}
raw.forEach(({ f, i, e }) => {
  {
    const at = f + '[' + i + '] ' + (e && e.key);
    const kind = TripData.FERRY_ROUTES[e.key] ? 'ferry' : TripData.SEA_CROSSINGS[e.key] ? 'sea' : null;
    if(!kind) return errors.push(at + ' : liaison inconnue');
    if(entries[e.key]) return errors.push(at + ' : liaison déjà renseignée dans ' + entries[e.key].file);
    if(!e.source || String(e.source).length < 8) errors.push(at + ' : source manquante');
    const out = { file: f, sides: {}, labels: {} };
    const sideOf = p => kind === 'sea' ? internals.zoneOf(p) : internals.landmassOf(p);
    for(const side of e.key.split('|')){
      const ports = e.ports && e.ports[side];
      if(!Array.isArray(ports) || !ports.length){ errors.push(at + ' : aucun port pour la rive « ' + side + ' »'); continue; }
      out.sides[side] = [];
      out.labels[side] = {};
      const pushPort = (port, ll) => {
        let idx = out.sides[side].findIndex(x => x[0] === ll[0] && x[1] === ll[1]);
        if(idx < 0){ out.sides[side].push(ll); idx = out.sides[side].length - 1; }
        const label = port.place || port.name;
        // Libellé en double sur une rive : pairs viserait un port au hasard.
        if(Object.prototype.hasOwnProperty.call(out.labels[side], label)) errors.push(at + ' ' + side + ' : port « ' + label + ' » en double');
        out.labels[side][label] = idx;
      };
      ports.forEach(port => {
        const pat = at + ' ' + side + ' ' + (port && port.cc) + ' ' + (port && (port.place || port.name));
        if(!port || !TripData.COUNTRIES[port.cc]) return errors.push(pat + ' : pays inconnu');
        const quay = port.quay;
        const isLatLon = (la, lo) => typeof la === 'number' && typeof lo === 'number' && Math.abs(la) <= 90 && Math.abs(lo) <= 180;
        if(port.near && !(Array.isArray(port.near) && isLatLon(port.near[0], port.near[1]))) return errors.push(pat + ' : near doit être [lat, lon] numériques');
        if(quay && !(/^(node|way|relation)\/\d+$/.test(String(quay.osm)) && isLatLon(quay.lat, quay.lon))){
          return errors.push(pat + ' : quay doit être { osm: "node/…", lat, lon } (élément OpenStreetMap)');
        }
        if(!port.place){
          // Quai sans localité correspondante dans les données (ex. Okushiri, Valdez) : rive contrôlée sur le quai lui-même,
          // avec les champs administratifs du lieu le plus proche du pays.
          if(!quay || !port.name) return errors.push(pat + ' : place manquant (ou name + quay)');
          let near = null;
          placesOf(port.cc).forEach(list => list.forEach(p => { const d = hv(quay.lat, quay.lon, p.lat, p.lon); if(!near || d < near.d) near = { d, p }; }));
          // Même avec sideNote, le quai doit rester dans le pays et à portée raisonnable des lieux connus.
          if(!near || near.d > 150) return errors.push(pat + ' : quai à plus de 150 km du lieu le plus proche du pays');
          const onSide = sideOf(Object.assign({}, near.p, { lat: quay.lat, lon: quay.lon })) === side;
          if(!onSide && !port.sideNote) return errors.push(pat + ' : quai hors de la rive selon landmassOf (justifier par sideNote)');
          return pushPort(port, [Math.round(quay.lat * 1e4) / 1e4, Math.round(quay.lon * 1e4) / 1e4]);
        }
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
        if(quay){
          // Quai OpenStreetMap : à moins de 60 km de la localité, et sur la même rive qu'elle.
          const d = hv(quay.lat, quay.lon, chosen.lat, chosen.lon);
          if(d > 60) return errors.push(pat + ' : quai à ' + Math.round(d) + ' km de la localité (60 km au plus)');
          if(sideOf(Object.assign({}, chosen, { lat: quay.lat, lon: quay.lon })) !== side && !port.sideNote){
            return errors.push(pat + ' : quai hors de la rive selon landmassOf (justifier par sideNote)');
          }
          return pushPort(port, [Math.round(quay.lat * 1e4) / 1e4, Math.round(quay.lon * 1e4) / 1e4]);
        }
        pushPort(port, [Math.round(chosen.lat * 1e4) / 1e4, Math.round(chosen.lon * 1e4) / 1e4]);
      });
    }
    // Paires de ports réellement desservies ensemble (facultatif) : [[port de la 1re rive, port de la 2de rive], …], par
    // place (ou name). Sans paires, les ports de chaque rive sont supposés tous reliés entre eux.
    if(e.pairs){
      const [s0, s1] = e.key.split('|');
      out.pairs = [];
      (Array.isArray(e.pairs) ? e.pairs : []).forEach(pr => {
        const i0 = out.labels[s0] && out.labels[s0][pr[0]], i1 = out.labels[s1] && out.labels[s1][pr[1]];
        if(i0 === undefined || i1 === undefined) return errors.push(at + ' : paire inconnue ' + JSON.stringify(pr) + ' (ordre : ' + s0 + ', ' + s1 + ')');
        if(!out.pairs.some(x => x[0] === i0 && x[1] === i1)) out.pairs.push([i0, i1]);
      });
      if(!out.pairs.length) errors.push(at + ' : pairs vide');
    }
    entries[e.key] = out;
  }
});

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

// Clé de propriété : entre apostrophes si elle ne contient que des caractères sûrs (sortie inchangée pour toutes les
// clés actuelles), sinon chaîne JSON échappée — jamais de texte brut entre apostrophes.
const quoteKey = k => /^[A-Za-z0-9|-]+$/.test(k) ? "'" + k + "'" : JSON.stringify(k);
// Ordre des liaisons : tri explicite des clés (12e audit du 19/09/2026). Il suivait l'ordre de FERRY_ROUTES dans
// trip-data.js, que build-island-rules.js peut changer d'une régénération à l'autre (« faroe|suduroy » et
// « continental|sakhalin » avaient changé de place) : lib/ferry-ports.js n'était plus reproduit à l'octet près. Le
// moteur ne lit FERRY_PORTS que par clé : l'ordre n'a aucun effet sur les trajets.
const body = allKeys.filter(k => entries[k]).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)).map(k => {
  const s = entries[k].sides;
  return '  ' + quoteKey(k) + ': { ' + Object.keys(s).map(side => quoteKey(side) + ': ' + JSON.stringify(s[side])).join(', ') +
    (entries[k].pairs ? ", pairs: " + JSON.stringify(entries[k].pairs) : '') + ' }';
}).join(',\n');
// Fichier réservé au serveur (lib/, bloqué par .htaccess) : les ports ne servent qu'au moteur, rien à livrer au navigateur.
const out = '// FICHIER GÉNÉRÉ par scripts/build-ferry-ports.js — ne pas modifier à la main (sources : scripts/ferry-ports/).\n' +
  '// Ports de chaque rive de chaque liaison de ferry ([lat, lon] : quai OpenStreetMap ou centre de la localité) et paires\n' +
  "// de ports desservies (indices dans l'ordre des rives de la clé) : partie par la route d'un trajet avec traversée.\n" +
  'module.exports = {\n' + body + '\n};\n';
fs.writeFileSync(FERRY_PORTS_FILE, out);
console.log('écrit dans ' + FERRY_PORTS_FILE);
