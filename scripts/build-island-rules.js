// Construit ISLAND_RULES et les ferries correspondants dans public/js/trip-data.js à partir de scripts/iles/*.js.
//
// Chaque fichier source exporte { landmass: { XX: { default?, rules: [{ key, match, note? }] } }, ferries: [...] } :
// - landmass : masses terrestres par pays (îles sans pont ni tunnel routier), évaluées dans l'ordre par
//   landmassOf (lib/trip-engine.js) ; types de match : regions, cpPrefix, box, near (voir matchTension) ;
//   clé '*' = chaque lieu isolé seul.
// - ferries : { a, b, routeKey, name, durationH, distanceKm, priceByClass: {1, 2, 5, foot} en EUROS (montant de
//   la grille pour les véhicules 1/2/5, ce qu'il couvre étant dit par priceCovers ; un passager pour foot), source, date, note } — uniquement des liaisons à tarif officiel publié.
//   Champs complémentaires (11e audit, 19/09/2026) — voir le commentaire en tête de FERRY_ROUTES dans trip-data.js :
//   priceCovers ('vehicle' | 'vehicleAndDriver' | 'vehicleAndOccupants' | null, OBLIGATOIRE dès qu'une classe a un
//   prix), priceCoversByClass (exceptions par classe 1/2/5), coversSource (d'où vient la règle : phrase de la grille ou
//   URL ; recopié dans le commentaire généré), durationEstimated (true si la durée n'est pas publiée par l'exploitant),
//   mode ('train' pour un train-auto).
//
// Le script VÉRIFIE avant d'écrire (pays connu, régions existantes, clés de ferry présentes dans les masses
// définies ou 'continental', prix numériques) et affiche le nombre de lieux par masse terrestre.
// Les noms de liaisons (name) sont ajoutés aux fichiers de langue par scripts/… — voir README.

const fs = require('fs');
const path = require('path');
const TripData = require('../public/js/trip-data.js');
const SRC = path.join(__dirname, 'iles');
const TRIP_DATA = path.join(__dirname, '..', 'public', 'js', 'trip-data.js');

const landmass = {}, ferries = [], errors = [], extraRules = [];
fs.readdirSync(SRC).filter(f => f.endsWith('.js')).sort().forEach(f => {
  const m = require(path.join(SRC, f));
  Object.entries(m.landmass || {}).forEach(([cc, v]) => {
    if(landmass[cc]) errors.push(f + ' : pays ' + cc + ' défini deux fois');
    landmass[cc] = v;
  });
  (m.ferries || []).forEach(x => ferries.push(Object.assign({ _file: f }, x)));
  if(m.landmassRules) extraRules.push([f, m.landmassRules]);
});
// Règles ajoutées par les fichiers de liaisons (ferries-*.js) : placées EN TÊTE des règles du pays, pour donner une clé
// nommée à une île jusqu'ici isolée lieu par lieu (clé '*') et la rendre reliable par ferry.
extraRules.forEach(([f, byCountry]) => Object.entries(byCountry).forEach(([cc, rules]) => {
  if(!landmass[cc]) return errors.push(f + ' : landmassRules pour ' + cc + ', pays sans règles d\'îles');
  landmass[cc] = Object.assign({}, landmass[cc], { rules: rules.concat(landmass[cc].rules || []) });
}));

function places(cc){
  const file = path.join(__dirname, '..', 'public', 'data', TripData.COUNTRIES[cc].file);
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => {
    const p = l.split(';'); const ll = p[1].split(',');
    return { cps: p[2].split(','), dept: p[3], lon: parseFloat(ll[0]), lat: parseFloat(ll[1]) };
  });
}
function hv(a, b, c, d){ const r = Math.PI/180, x = Math.sin((c-a)*r/2)**2 + Math.cos(a*r)*Math.cos(c*r)*Math.sin((d-b)*r/2)**2; return 12742*Math.asin(Math.sqrt(x)); }
function match(m, p){
  if(m.regions) return m.regions.indexOf(p.dept || '') !== -1;
  if(m.cpPrefix) return p.cps.some(cp => m.cpPrefix.some(x => cp.indexOf(x) === 0));
  if(m.box) return m.box.some(b => p.lat >= b[0] && p.lat <= b[1] && p.lon >= b[2] && p.lon <= b[3]);
  if(m.near) return m.near.some(n => hv(p.lat, p.lon, n.lat, n.lon) <= n.km);
  return false;
}
const keys = new Set(['continental']);
// Masses terrestres définies ailleurs que dans scripts/iles (code historique du moteur et de trip-data.js) : valeurs
// renvoyées par landmassOf, noms d'ISLAND_BOXES, tables d'îles grecques/croates/cap-verdiennes et paires des liaisons
// écrites à la main dans FERRY_ROUTES. Un fichier de scripts/iles peut ainsi ajouter une liaison vers ces îles.
const ENGINE_SRC = fs.readFileSync(path.join(__dirname, '..', 'lib', 'trip-engine.js'), 'utf8');
const DATA_SRC = fs.readFileSync(TRIP_DATA, 'utf8');
// Marqueurs des blocs remplacés plus bas : chacun exactement une fois, sinon arrêt (un remplacement sans correspondance
// ne changerait rien sans le dire).
const countOf = (src, str) => src.split(str).length - 1;
['var FERRY_ROUTES = {', 'var ISLAND_RULES = {', '// BEGIN AUTO FERRIES', '// END AUTO FERRIES'].forEach(mk => {
  const n = countOf(DATA_SRC, mk);
  if(n !== 1){ console.log('ERREUR — rien n\'est écrit : marqueur « ' + mk + ' » trouvé ' + n + ' fois dans ' + TRIP_DATA); process.exit(1); }
});
const PAIR_LINE_RE = /^\s*'([A-Za-z0-9-]+\|[A-Za-z0-9-]+)':/gm; // clés à tiret comprises (RU|RU-KGD, ES|ES-CE)
const AUTO_BLOCK_RE = /\/\/ BEGIN AUTO FERRIES[\s\S]*?\/\/ END AUTO FERRIES/;
const autoPairs = new Set((DATA_SRC.match(AUTO_BLOCK_RE)[0].match(PAIR_LINE_RE) || []).map(m => m.trim().slice(1, -2)));
const MANUAL_FERRY_SRC = DATA_SRC.replace(AUTO_BLOCK_RE, '');
const manualPairs = new Set();
// Paires écrites en toutes lettres (FERRY_ROUTES et SEA_CROSSINGS), plus celles ajoutées par code
// (FERRY_ROUTES['continental|wadden-' + island]) : clés de l'objet chargé, hors bloc automatique.
(MANUAL_FERRY_SRC.slice(MANUAL_FERRY_SRC.indexOf('var FERRY_ROUTES')).match(PAIR_LINE_RE) || []).map(m => m.trim().slice(1, -2))
  .concat(Object.keys(TripData.FERRY_ROUTES).filter(k => !autoPairs.has(k)))
  .forEach(p => {
    manualPairs.add(p);
    // Masses terrestres : paires de FERRY_ROUTES seulement (SEA_CROSSINGS relie des zones, pas des masses).
    if(TripData.FERRY_ROUTES[p]) p.split('|').forEach(k => keys.add(k));
  });
(ENGINE_SRC.match(/return '([A-Za-z][A-Za-z0-9]*)'/g) || []).forEach(m => keys.add(m.slice(8, -1)));
(ENGINE_SRC.match(/\? '[A-Za-z][A-Za-z0-9]*' : '[A-Za-z][A-Za-z0-9]*'/g) || []).forEach(m => m.match(/'[^']+'/g).forEach(k => keys.add(k.slice(1, -1))));
(DATA_SRC.match(/\[\s*'([a-z][A-Za-z0-9]*)',\s*-?[0-9.]+,/g) || []).forEach(m => keys.add(m.match(/'([^']+)'/)[1]));
(DATA_SRC.match(/\/, '([a-z][A-Za-z0-9]*)'\]/g) || []).forEach(m => keys.add(m.match(/'([^']+)'/)[1]));
const cvMap = DATA_SRC.match(/var CV_CONCELHO_TO_ISLAND = \{([\s\S]*?)\};/);
if(cvMap) (cvMap[1].match(/:\s*'([a-zA-Z]+)'/g) || []).forEach(m => keys.add(m.match(/'([^']+)'/)[1]));
if(process.argv.includes('--keys')){ console.log([...keys].sort().join(' ')); console.log('Paires manuelles : ' + [...manualPairs].sort().join(' ')); process.exit(0); }
const counts = {};
Object.entries(landmass).forEach(([cc, v]) => {
  if(!TripData.COUNTRIES[cc]) return errors.push('pays inconnu ' + cc);
  const P = places(cc);
  const known = new Set(P.map(p => p.dept));
  (v.rules || []).forEach(r => {
    if(!r.key || !r.match) errors.push(cc + ' : règle incomplète');
    if(r.match && r.match.regions) r.match.regions.forEach(x => { if(!known.has(x)) errors.push(cc + ' : région inconnue « ' + x + ' »'); });
    if(r.key !== '*') keys.add(r.key);
  });
  if(v.default && v.default !== '*') keys.add(v.default);
  const c = {};
  P.forEach(p => {
    const r = (v.rules || []).find(r => match(r.match, p));
    const d = v.fallthrough ? '(logique du pays)' : v.default === '*' ? '* (isolés)' : (v.default || 'continental');
    const k = r ? (r.key === '*' ? '* (isolés)' : r.key) : d;
    c[k] = (c[k] || 0) + 1;
  });
  counts[cc] = c;
});
// Valeurs insérées telles quelles dans trip-data.js (entre apostrophes ou comme nombres) : format strict.
const ROUTE_KEY_RE = /^[A-Za-z0-9]+$/, PAIR_KEY_RE = /^[A-Za-z0-9-]+\|[A-Za-z0-9-]+$/;
ferries.forEach(x => {
  if(!ROUTE_KEY_RE.test(String(x.routeKey))) errors.push(x._file + ' : routeKey invalide ' + JSON.stringify(x.routeKey) + ' (lettres et chiffres seulement)');
  if(!PAIR_KEY_RE.test([x.a, x.b].sort().join('|'))) errors.push(x._file + ' : ferry ' + x.routeKey + ' clés invalides ' + JSON.stringify([x.a, x.b]) + ' (lettres, chiffres et tirets seulement)');
  if(typeof x.durationH !== 'number' || typeof x.distanceKm !== 'number') errors.push(x._file + ' : ferry ' + x.routeKey + ' durée/distance non numériques');
  if(manualPairs.has([x.a, x.b].sort().join('|'))) errors.push(x._file + ' : ferry ' + x.routeKey + " en doublon d'une liaison écrite à la main dans FERRY_ROUTES");
  if(!keys.has(x.a) || !keys.has(x.b)) errors.push(x._file + ' : ferry ' + x.routeKey + ' vers une masse inconnue (' + x.a + ', ' + x.b + ')');
  // Prix absent autorisé seulement s'il est explicitement null (grille sans tarif pour cette classe) ou si la liaison
  // entière est sans tarif (priceStatus 'variable' ou 'unknown') : le moteur la propose avec un avertissement.
  if(x.priceStatus && ['variable', 'unknown'].indexOf(x.priceStatus) === -1) errors.push(x._file + ' : ferry ' + x.routeKey + ' priceStatus invalide');
  ['1', '2', '5', 'foot'].forEach(k => { const v = (x.priceByClass || {})[k]; if(typeof v !== 'number' && v !== null && !(x.priceStatus && v === undefined)) errors.push(x._file + ' : ferry ' + x.routeKey + ' prix ' + k + ' manquant'); });
  if(!(x.durationH > 0) || !(x.distanceKm > 0)) errors.push(x._file + ' : ferry ' + x.routeKey + ' durée/distance');
  // Couverture du prix : obligatoire (valeur ou null explicite) dès qu'une classe a un montant, avec sa justification.
  const COVERS = ['vehicle', 'vehicleAndDriver', 'vehicleAndOccupants', null];
  const priced = ['1', '2', '5', 'foot'].some(k => typeof (x.priceByClass || {})[k] === 'number');
  if(priced && !('priceCovers' in x)) errors.push(x._file + ' : ferry ' + x.routeKey + ' priceCovers manquant (valeur ou null)');
  if('priceCovers' in x && COVERS.indexOf(x.priceCovers) === -1) errors.push(x._file + ' : ferry ' + x.routeKey + ' priceCovers invalide');
  if(priced && !x.coversSource) errors.push(x._file + ' : ferry ' + x.routeKey + ' coversSource manquant');
  Object.entries(x.priceCoversByClass || {}).forEach(([k, v]) => { if(['1', '2', '5'].indexOf(k) === -1 || COVERS.indexOf(v) === -1) errors.push(x._file + ' : ferry ' + x.routeKey + ' priceCoversByClass invalide'); });
  if('durationEstimated' in x && typeof x.durationEstimated !== 'boolean') errors.push(x._file + ' : ferry ' + x.routeKey + ' durationEstimated non booléen');
  if('mode' in x && ['train'].indexOf(x.mode) === -1) errors.push(x._file + ' : ferry ' + x.routeKey + ' mode invalide');
  if(priced && !x.source) errors.push(x._file + ' : ferry ' + x.routeKey + ' prix sans source');
  if(priced && !/^\d{4}-\d{2}(-\d{2})?$/.test(String(x.date || ''))) errors.push(x._file + ' : ferry ' + x.routeKey + ' prix sans date (AAAA-MM[-JJ])');
});
if(errors.length){ console.log('ERREURS — rien n\'est écrit :\n' + errors.join('\n')); process.exit(1); }

const s0 = fs.readFileSync(TRIP_DATA, 'utf8');
let s = s0;
const rulesOut = Object.entries(landmass).map(([cc, v]) => {
  const o = { rules: v.rules.map(r => ({ key: r.key, match: r.match })) };
  if(v.default) o.default = v.default;
  if(v.fallthrough) o.fallthrough = true;
  return '      ' + cc + ': ' + JSON.stringify(o);
});
const ISLAND_RULES_RE = /var ISLAND_RULES = \{[\s\S]*?\n?\s*\};/, AUTO_FERRIES_RE = /(\/\/ BEGIN AUTO FERRIES[^\n]*\n)[\s\S]*?(\s*\/\/ END AUTO FERRIES)/;
[ISLAND_RULES_RE, AUTO_FERRIES_RE].forEach(re => { if(!re.test(s)){ console.log('ERREUR — rien n\'est écrit : bloc ' + re + ' introuvable'); process.exit(1); } });
s = s.replace(ISLAND_RULES_RE, () => 'var ISLAND_RULES = {\n' + rulesOut.join(',\n') + '\n    };');
function price(x, k){ const v = (x.priceByClass || {})[k]; return typeof v === 'number' ? v : 'null'; }
// Texte d'un commentaire // : aucun saut de ligne (y compris U+2028/U+2029, fins de ligne pour JavaScript).
const oneLine = v => String(v).replace(/[\r\n\u2028\u2029]/g, ' ');
const ferryOut = ferries.map(x => {
  const key = [x.a, x.b].sort().join('|');
  const cov = v => v === null ? 'null' : "'" + v + "'";
  const byClass = Object.entries(x.priceCoversByClass || {});
  return '      // ' + oneLine(x.name) + ' — ' + oneLine(x.operator || '') + ', ' + oneLine(x.source) + ' (' + oneLine(x.date) + ')' + (x.note ? ' ; ' + oneLine(x.note) : '') +
    (x.coversSource ? ' ; Prix couvre : ' + oneLine(x.coversSource) : '') + '\n' +
    "      '" + key + "': { routeKey:'ferry.route." + x.routeKey + "', durationH:" + x.durationH + ', distanceKm:' + x.distanceKm +
    ', priceByClass:{1:' + price(x, 1) + ', 2:' + price(x, 2) + ', 5:' + price(x, 5) + ', foot:' + price(x, 'foot') + '}' +
    (x.priceStatus ? ", priceStatus:'" + x.priceStatus + "'" : '') +
    ('priceCovers' in x ? ', priceCovers:' + cov(x.priceCovers) : '') +
    (byClass.length ? ', priceCoversByClass:{' + byClass.map(([k, v]) => k + ':' + cov(v)).join(', ') + '}' : '') +
    (x.durationEstimated ? ', durationEstimated:true' : '') +
    (x.mode ? ", mode:'" + x.mode + "'" : '') +
    (x.passengerOnly ? ', passengerOnly:true' : '') + ' },';
});
s = s.replace(AUTO_FERRIES_RE, (m, a, b) => a + ferryOut.join('\n') + (ferryOut.length ? '\n' : '') + b.replace(/^\n/, ''));
// trip-data.js est modifié en parallèle par d'autres scripts (autres blocs) : on n'écrit que si le fichier est encore
// exactement celui qui a servi de base (relu juste avant l'écriture), sinon on s'arrête sans rien écraser.
if(fs.readFileSync(TRIP_DATA, 'utf8') !== s0){ console.log('ERREUR — rien n\'est écrit : ' + TRIP_DATA + ' a changé pendant la génération, relancer.'); process.exit(1); }
fs.writeFileSync(TRIP_DATA, s);
fs.writeFileSync(path.join(__dirname, 'iles', '.ferry-names.json'), JSON.stringify(ferries.map(x => ({ routeKey: x.routeKey, name: x.name })), null, 1));
Object.entries(counts).forEach(([cc, c]) => console.log(cc, JSON.stringify(c)));
console.log(Object.keys(landmass).length + ' pays, ' + ferries.length + ' ferries écrits.');
// Les ports des liaisons (lib/ferry-ports.js) dépendent des clés écrites ci-dessus : contrôle immédiat, pour qu'une clé
// nouvelle ou renommée ne retombe pas en silence sur l'estimation sans ports.
const portsCheck = require('child_process').spawnSync(process.execPath, [path.join(__dirname, 'build-ferry-ports.js'), '--strict', '--check'], { encoding: 'utf8' });
process.stdout.write('[ports de ferry] ' + (portsCheck.stdout || '') + (portsCheck.stderr || ''));
if(portsCheck.status !== 0) console.log('ATTENTION : compléter scripts/ferry-ports/ puis lancer node scripts/build-ferry-ports.js');
