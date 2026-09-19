// Chargement du moteur RÉEL pour les tests, avec accès en lecture à ses fonctions internes, et vérificateur d'invariants
// d'un tirage (repris de l'outil du 10e audit).
//
// Le moteur n'exporte qu'une partie de ses fonctions. Pour vérifier un tirage avec les MÊMES règles que lui (masse
// terrestre, zone, liaison de ferry, zone à tension…), le source de lib/trip-engine.js est compilé EN MÉMOIRE avec une
// ligne d'export supplémentaire : aucun fichier du dépôt n'est modifié. Chaque nom est exporté seulement s'il existe
// encore (typeof), pour qu'un renommage dans le moteur fasse échouer clairement le seul contrôle concerné au lieu de
// casser le chargement.
//
// Chargement ~30 s et ~3 Go : une seule fois par processus (load() mémorise la promesse).
'use strict';
const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = path.resolve(__dirname, '..', '..');
const TD = require(path.join(ROOT, 'public', 'js', 'trip-data.js'));
const LG = require(path.join(ROOT, 'lib', 'land-grid.js'));
const TG = require(path.join(ROOT, 'lib', 'toll-grid.js'));

const INTERNAL_FUNCS = ['reallyAdjacent', 'landmassOf', 'zoneOf', 'ferryRouteFor', 'seaCrossingFor', 'tensionOf', 'legAllowed',
  'ferryRoadParts', 'tollCountryOf', 'evPlan', 'countryAtPoint', 'insideCountry', 'roadCrossesWater', 'motoMotorwayBan',
  'normalizeCityName', 'chargerNear', 'portZone', 'communeLandmass', 'borderReach', 'communeTension', 'finalizeLeg', 'parseCommunesFile',
  'countrySpeedFactor', 'placeNorm', 'zoneHostNorm'];
const INTERNAL_VARS = ['COMMUNES', 'FEATURED', 'CHARGER_COUNT', 'TENSION_RULES_BY_COUNTRY', 'AVOID_TENSION', 'LEG_CONSTRAINTS',
  'LAST_TRIP_DIAGNOSTIC', 'TRIP_DEADLINE', 'TRIP_TIMED_OUT', 'TRIP_TIME_BUDGET_MS', 'MOTO_NO_MOTORWAY_SPEED_FACTOR', 'MOTO_NO_MOTORWAY_SPEED_FACTOR_DEFAULT'];

function compilePatched(){
  const file = path.join(ROOT, 'lib', 'trip-engine.js');
  let src = fs.readFileSync(file, 'utf8');
  const g = n => '(typeof ' + n + ' !== "undefined" ? ' + n + ' : undefined)';
  src += '\n;module.exports.__test = {' +
    INTERNAL_FUNCS.map(n => n + ': ' + g(n)).join(', ') + ', ' +
    INTERNAL_VARS.map(n => 'get ' + n + '(){ return ' + g(n) + '; }').join(', ') +
    ', state: function(){ return { AVOID_TENSION: ' + g('AVOID_TENSION') + ', LEG_CONSTRAINTS: ' + g('LEG_CONSTRAINTS') +
    ', LAST_TRIP_DIAGNOSTIC: ' + g('LAST_TRIP_DIAGNOSTIC') + ', TRIP_DEADLINE: ' + g('TRIP_DEADLINE') + ', TRIP_TIMED_OUT: ' + g('TRIP_TIMED_OUT') + ' }; } };\n';
  const m = new Module(file, module);
  m.filename = file;
  m.paths = Module._nodeModulePaths(path.dirname(file));
  m._compile(src, file);
  return m.exports;
}

let loading = null;
let engine = null;
// Moteur initialisé comme par server.js (lieux, lieux mis en avant, bornes de recharge), sans index de recherche.
function load(){
  if(loading) return loading;
  loading = (async () => {
    const t0 = Date.now();
    const e = compilePatched();
    let bundle = fs.readFileSync(path.join(ROOT, 'public', 'data', 'communes-bundle.txt'), 'utf8');
    await e.init(bundle, '', fs.readFileSync(path.join(ROOT, 'public', 'data', 'featured.txt'), 'utf8'), { skipSearchIndex: true });
    bundle = null;
    const chargers = path.join(ROOT, 'data', 'charging-stations.txt');
    if(fs.existsSync(chargers)) e.loadChargingStations(fs.readFileSync(chargers, 'utf8'));
    engine = e;
    if(process.env.TEST_VERBOSE) process.stderr.write('[tests] moteur prêt en ' + (Date.now() - t0) + ' ms\n');
    return e;
  })();
  return loading;
}

// ------------------------------------------------------------------------------------------------ hasard reproductible
function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const NATIVE_RANDOM = Math.random;
// Math.random remplacé pendant l'appel : paramètres + graine = tirage reproductible (hors coupure par le budget de temps).
function withSeed(seed, fn){
  Math.random = mulberry32(seed);
  try { return fn(); } finally { Math.random = NATIVE_RANDOM; }
}

// ------------------------------------------------------------------------------------------------ géométrie
function hav(lat1, lon1, lat2, lon2){
  const R = 6371, toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}
const ROAD = 1.287; // ROAD_FACTOR du moteur
const road = (a, b) => hav(a.lat, a.lon, b.lat, b.lon) * ROAD;

// Objet departureCity tel que l'envoie le client, à partir d'un lieu du moteur.
function depObj(c){ return { name: c.name, cp: c.cps[0], lat: c.lat, lon: c.lon, dept: c.dept, country: c.country, allCps: c.cps.slice() }; }

// Lieux du moteur par pays, et recherche d'un lieu par nom (le plus peuplé).
let byCountryCache = null;
function byCountry(){
  if(byCountryCache) return byCountryCache;
  byCountryCache = new Map();
  for(const c of engine.__test.COMMUNES){ let a = byCountryCache.get(c.country); if(!a) byCountryCache.set(c.country, a = []); a.push(c); }
  return byCountryCache;
}
function findPlace(name, cc){
  const list = byCountry().get(cc) || [], q = engine.__test.normalizeCityName(name);
  return list.filter(c => c.norm === q).sort((a, b) => b.pop - a.pop)[0] ||
    list.filter(c => c.norm.indexOf(q) === 0).sort((a, b) => b.pop - a.pop)[0] || null;
}
function dep(name, cc){ const c = findPlace(name, cc); return c ? depObj(c) : null; }

// Mer par la route : même règle que le moteur (25 km d'eau d'affilée ou barrière -> chemin terrestre ≤ 1,8 × requis),
// calculée ici SANS date limite.
function crossesSea(a, b){
  const km = hav(a.lat, a.lon, b.lat, b.lon);
  if(km < 25) return false;
  if(LG.waterRunKm(a.lat, a.lon, b.lat, b.lon, km, 25) < 25 && !LG.crossesBarrier(a.lat, a.lon, b.lat, b.lon)) return false;
  return !isFinite(LG.landPathKm(a.lat, a.lon, b.lat, b.lon, km * 1.8));
}

function labelMin(label){
  let m = String(label || '').match(/^(\d+)h(\d*)$/); if(m) return +m[1] * 60 + (m[2] ? +m[2] : 0);
  m = String(label || '').match(/^(\d+) min$/); return m ? +m[1] : NaN;
}
function isoDate(d){ return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function addDays(d, n){ const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function parseIso(s){
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); if(!m) return null;
  const y = +m[1], mo = +m[2], da = +m[3], ty = new Date().getFullYear();
  if(y < ty - 1 || y > ty + 3) return null;
  const d = new Date(y, mo - 1, da);
  return (d.getFullYear() === y && d.getMonth() === mo - 1 && d.getDate() === da) ? d : null;
}

// Paramètres tels que les normalise generateTrip — règles ATTENDUES, écrites indépendamment du moteur.
function normParams(p){
  const T = TD.TRANSPORT;
  const transportKey = Object.prototype.hasOwnProperty.call(T, p.transportKey) ? p.transportKey : 'voiture-thermique';
  const budgetKey = ['economique', 'moyen', 'confortable'].indexOf(p.budgetKey) !== -1 ? p.budgetKey : 'moyen';
  let radius = Number(p.maxRadiusKm); if(!isFinite(radius) || radius <= 0) radius = 300; radius = Math.min(Math.max(radius, 20), 3000);
  let minD = Number(p.minDistanceKm), maxD = Number(p.maxDistanceKm);
  minD = isFinite(minD) ? Math.min(Math.max(minD, 0), 3000) : 0;
  maxD = isFinite(maxD) ? Math.min(Math.max(maxD, 0), 3000) : 0;
  const days = Math.round(Number(p.days));
  let minDays = Math.round(Number(p.minDaysPerCity)); if(!isFinite(minDays) || minDays < 1) minDays = 1;
  let maxDays = Math.round(Number(p.maxDaysPerCity)); if(!isFinite(maxDays) || maxDays < 1) maxDays = 3;
  maxDays = Math.min(maxDays, 20); minDays = Math.min(minDays, maxDays);
  if(days > 1) minDays = Math.min(minDays, days - 1);
  let maxLeg = Math.round(Number(p.maxLegKm)); if(!isFinite(maxLeg) || maxLeg <= 0) maxLeg = transportKey === 'velo' ? 80 : 400;
  maxLeg = Math.min(Math.max(maxLeg, 5), 3000);
  const pc = (typeof p.preferredCurrency === 'string' && /^[A-Z]{3}$/.test(p.preferredCurrency)) ? p.preferredCurrency : null;
  return { transportKey, budgetKey, radius, minD, maxD, days, minDays, maxDays, maxLeg, ferry: !!p.ferryEnabled, toll: !!p.tollEnabled,
    avoidTension: p.avoidTension !== false, pc, tripStart: parseIso(p.tripStart), speed: T[transportKey].speed,
    electric: !!T[transportKey].electric, ferryClass: T[transportKey].ferryClass, tollClass: T[transportKey].tollClass };
}

const TOLL_COUNTRIES = Object.keys(TD.TOLL_RATE_BY_COUNTRY);
const REACH_AIR = TD.EV_RANGE_KM * TD.EV_CHARGE_MARGIN / ROAD;
function fullBan(cc){ const b = cc && engine.__test.motoMotorwayBan(cc); return !!(b && b.fullBan); }
// Facteur de vitesse d'une moto privée d'autoroute : même ordre de recherche de la règle que finalizeLeg (pays passé,
// départ, arrivée) ; facteur mesuré par pays depuis le 10e audit (0,8 unique auparavant).
// Facteur de vitesse du pays (relevé OSRM par pays, 11e audit) : vitesse du mode × facteur, sauf à vélo.
function speedOf(N, from, to, cArg){
  const A = engine.__test;
  const f = (N.transportKey === 'velo' || !A.countrySpeedFactor) ? 1 : A.countrySpeedFactor(from, to, cArg);
  return N.speed * f * (N.transportKey === 'moto' ? motoFactor(cArg, from, to) : 1);
}
function motoFactor(cArg, from, to){
  const A = engine.__test, mb = c => c && A.motoMotorwayBan(c);
  const ban = mb(cArg) || mb(from && from.country) || mb(to && to.country);
  if(!ban || !ban.fullBan) return 1;
  const F = A.MOTO_NO_MOTORWAY_SPEED_FACTOR, D = A.MOTO_NO_MOTORWAY_SPEED_FACTOR_DEFAULT;
  if(typeof F === 'number') return F;
  return (F && ban.rule && F[ban.rule.country]) || D || 0.8;
}
function legPoint(leg){ return { name: leg.stop, lat: leg.lat, lon: leg.lon, dept: leg.dept, country: leg.country, cp: leg.cp, allCps: leg.allCps, cps: leg.allCps }; }
function segMinDist(p, a, b, stepKm){
  const km = hav(a.lat, a.lon, b.lat, b.lon), n = Math.max(2, Math.ceil(km / (stepKm || 2)));
  let dLon = b.lon - a.lon; if(dLon > 180) dLon -= 360; else if(dLon < -180) dLon += 360;
  let best = Infinity;
  for(let i = 0; i <= n; i++){ const f = i / n; let lo = a.lon + dLon * f; if(lo >= 180) lo -= 360; else if(lo < -180) lo += 360; best = Math.min(best, hav(p.lat, p.lon, a.lat + (b.lat - a.lat) * f, lo)); }
  return best;
}
function segHasTollCell(a, b, cc){
  const km = hav(a.lat, a.lon, b.lat, b.lon), n = Math.max(8, Math.ceil(km / 5));
  for(let i = 0; i <= n; i++){ const f = i / n; if(TG.cellCountry(a.lat + (b.lat - a.lat) * f, a.lon + (b.lon - a.lon) * f, cc)) return true; }
  return false;
}
function timeBudgetMs(){ const b = engine.__test.TRIP_TIME_BUDGET_MS; return typeof b === 'number' ? b : 4000; }

// État global du moteur hors tirage : valeurs de repos attendues.
function stateIsReset(){
  const st = engine.__test.state();
  return st.AVOID_TENSION === true && st.LEG_CONSTRAINTS && st.LEG_CONSTRAINTS.maxLegKm === 0 && st.LEG_CONSTRAINTS.electric === false &&
    st.LEG_CONSTRAINTS.ferryEnabled === true && st.LAST_TRIP_DIAGNOSTIC === null && st.TRIP_DEADLINE === 0 && st.TRIP_TIMED_OUT === false;
}

// ------------------------------------------------------------------------------------------------------------------
// Vérification d'un tirage. Renvoie { v: [violations {inv, sev, msg, …}], applied: {invariant: nb}, empty, stays }
// ------------------------------------------------------------------------------------------------------------------
function check(params, res, elapsedMs){
  const A = engine.__test;
  const v = [], applied = {};
  const ap = k => { applied[k] = (applied[k] || 0) + 1; };
  const bad = (inv, sev, msg, extra) => v.push(Object.assign({ inv, sev, msg }, extra || {}));
  const N = normParams(params);
  const dep = params.departureCity;
  const depPt = { name: dep.name, lat: +dep.lat, lon: +dep.lon, dept: dep.dept, country: dep.country, cp: dep.cp, allCps: dep.allCps || [], cps: dep.allCps || [] };

  // État remis à zéro
  ap('etat');
  if(!stateIsReset()) bad('etat', 'haute', 'état global non remis à zéro', { st: A.state() });

  // Valeurs NaN/undefined/négatives
  ap('valeurs');
  (function scan(o, p){
    if(o === undefined){ bad('valeurs', 'moyenne', 'undefined en ' + p); return; }
    if(typeof o === 'number'){ if(!isFinite(o)) bad('valeurs', 'haute', 'nombre non fini en ' + p, { val: String(o) }); else if(o < 0 && !/\.(lat|lon)$/.test(p)) bad('valeurs', 'moyenne', 'nombre négatif en ' + p, { val: o }); return; }
    if(typeof o === 'string'){ if(/undefined|NaN|\[object/.test(o) && !/\.(stop|name|norm|dept)$/.test(p)) bad('valeurs', 'moyenne', 'chaîne suspecte en ' + p, { val: o.slice(0, 200) }); return; }
    if(o && typeof o === 'object'){ for(const k of Object.keys(o)) scan(o[k], p + '.' + k); }
  })(res, 'res');

  ap('maxLegKmRenvoye');
  if(res.maxLegKm !== undefined && res.maxLegKm !== N.maxLeg) bad('maxLegKmRenvoye', 'basse', 'maxLegKm renvoyé ' + res.maxLegKm + ' ≠ ' + N.maxLeg);

  const legs = res.legs || [];
  // Diagnostics
  ap('diagnostics');
  if(res.timedOut && legs.length) bad('diagnostics', 'moyenne', 'timedOut avec des étapes');
  if(res.minDistanceNotFound && (legs.length || !(N.minD > 0))) bad('diagnostics', 'moyenne', 'minDistanceNotFound incohérent');
  if(res.tensionBlocked && (legs.length || !N.avoidTension)) bad('diagnostics', 'moyenne', 'tensionBlocked incohérent');
  if(res.timedOut && elapsedMs < timeBudgetMs() * 0.97) bad('diagnostics', 'basse', 'timedOut après seulement ' + elapsedMs + ' ms');
  if(N.days > 1){
    const totalNights = N.days - 1;
    const mps = Math.max(1, Math.min(15, totalNights, Math.floor(totalNights / N.minDays) || 1));
    let unreach = false, returnCap = null;
    if(N.minD > 0 && mps >= 2){
      let hop = Math.max(35, Math.min((N.maxD > 0 ? N.maxD : 600) * 0.5, 220)) * ROAD; hop = Math.min(hop, N.maxLeg);
      const cap = N.maxD > 0 ? Math.min(N.radius, N.maxD) : N.radius;
      unreach = 1 + Math.ceil(Math.max(0, N.minD - cap) / hop) > mps;
      returnCap = Math.round(Math.min(cap, N.maxLeg));
    }
    const depLm = A.landmassOf(depPt);
    const isolated = TD.NO_TRIP_LANDMASSES[depLm] || (/^[A-Z]{2}:-?\d/.test(depLm));
    ap('diagMinDistanceUnreachable');
    if(unreach && !res.minDistanceUnreachable && !isolated) bad('diagMinDistanceUnreachable', 'moyenne', 'éloignement inatteignable non signalé', { legsN: legs.length });
    if(!unreach && res.minDistanceUnreachable) bad('diagMinDistanceUnreachable', 'moyenne', 'minDistanceUnreachable signalé à tort');
    if(res.minDistanceUnreachable && res.returnCapKm !== returnCap) bad('diagMinDistanceUnreachable', 'basse', 'returnCapKm ' + res.returnCapKm + ' ≠ ' + returnCap);
  }
  if(!legs.length) return { v, applied, empty: true };

  // ---------------- Structure et jours
  ap('jours');
  if(N.days === 1){
    if(legs.length !== 2 || legs[0].labelKind !== 'single' || legs[1].labelKind !== 'returnBare' || legs[0].isReturn || !legs[1].isReturn)
      bad('jours', 'haute', 'aller-retour : structure inattendue', { n: legs.length });
  } else {
    if(legs.length !== N.days) bad('jours', 'haute', 'nombre de journées ' + legs.length + ' ≠ ' + N.days);
    legs.forEach((l, i) => { if(l.dayNum !== i + 1) bad('jours', 'moyenne', 'dayNum ' + l.dayNum + ' à l\'indice ' + i); });
    if(legs[legs.length - 1].labelKind !== 'dayReturn') bad('jours', 'moyenne', 'dernier libellé ' + legs[legs.length - 1].labelKind);
  }
  legs.forEach((l, i) => { if(!!l.isReturn !== (i === legs.length - 1)) bad('jours', 'haute', 'isReturn inattendu à ' + i); });

  // ---------------- Retour au départ
  ap('retour');
  const last = legs[legs.length - 1];
  if(!(last.isReturn && Math.abs(last.lat - depPt.lat) < 1e-9 && Math.abs(last.lon - depPt.lon) < 1e-9 && last.stop === dep.name)) bad('retour', 'haute', 'dernier trajet ne revient pas au départ');

  // ---------------- Séjours (nuits consécutives)
  const stays = [];
  legs.forEach((l, i) => {
    if(l.isReturn) return;
    if(N.days > 1 && i > 0 && stays.length && stays[stays.length - 1].norm === l.norm) stays[stays.length - 1].nights++;
    else stays.push({ norm: l.norm, nights: 1, idx: i, leg: l });
  });
  ap('nuitsParVille');
  if(N.days > 1){
    const over = stays.some(s => s.nights > N.maxDays);
    const notice = (res.notices || []).includes('days.overMaxPerCity');
    if(over !== notice) bad('nuitsParVille', 'moyenne', 'avis days.overMaxPerCity ' + notice + ' alors que dépassement = ' + over, { nights: stays.map(s => s.nights) });
    stays.forEach(s => { if(s.nights < N.minDays) bad('nuitsParVille', 'moyenne', 'ville à ' + s.nights + ' nuit(s) < minimum ' + N.minDays, { nights: stays.map(x => x.nights), stays: stays.length }); });
    const tot = stays.reduce((a, s) => a + s.nights, 0);
    if(tot !== N.days - 1) bad('nuitsParVille', 'haute', 'total des nuits ' + tot + ' ≠ ' + (N.days - 1));
  }
  ap('nbVilles');
  if(stays.length > 15) bad('nbVilles', 'moyenne', stays.length + ' villes > 15');

  // ---------------- Doublons, départ, avoidNorm
  ap('doublons');
  const depNorm = A.normalizeCityName(dep.name);
  const seen = new Set();
  stays.forEach(s => {
    if(seen.has(s.norm)) bad('doublons', 'moyenne', 'ville répétée ' + s.norm);
    seen.add(s.norm);
    if(s.norm === depNorm) bad('doublons', 'moyenne', 'ville de départ tirée comme étape');
    if(hav(s.leg.lat, s.leg.lon, depPt.lat, depPt.lon) < 2) bad('doublons', 'moyenne', 'étape à moins de 2 km du départ');
    if(params.avoidNorm && s.norm === A.normalizeCityName(String(params.avoidNorm).slice(0, 200))) bad('doublons', 'moyenne', 'avoidNorm tiré');
  });

  // ---------------- Éloignement / rayon
  const first = stays[0].leg;
  ap('eloignementMin');
  const dFirst = road(depPt, first);
  if(N.minD > 0 && dFirst < N.minD - 1) bad('eloignementMin', 'haute', 'premier trajet à ' + dFirst.toFixed(1) + ' km < éloignement ' + N.minD);
  ap('eloignementMax');
  if(N.maxD > 0) stays.forEach(s => { const d = road(depPt, s.leg); if(d > N.maxD + 1) bad('eloignementMax', 'haute', 'étape à ' + d.toFixed(1) + ' km > maxDistanceKm ' + N.maxD, { stop: s.leg.stop }); });
  ap('rayonRetour');
  const lastStay = stays[stays.length - 1].leg, dLast = road(depPt, lastStay);
  const capAll = N.maxD > 0 ? Math.min(N.radius, N.maxD) : N.radius;
  let capLast;
  if(N.days === 1) capLast = Math.min(N.minD > 0 ? Math.max(N.radius, N.minD * 1.4) : N.radius, N.maxD > 0 ? N.maxD : Infinity);
  else if(stays.length === 1) capLast = N.minD > 0 ? Math.max(capAll, N.minD * 1.4) : capAll;
  else capLast = capAll;
  if(dLast > capLast + 1) bad('rayonRetour', 'haute', 'dernière étape à ' + dLast.toFixed(1) + ' km > limite de retour ' + capLast.toFixed(0), { stays: stays.length });

  // ---------------- Trajets
  const firstLegCap = Math.max(N.maxLeg, N.minD * 1.4);
  let prev = depPt, prevLeg = null;
  let ferryUsed = false;
  const motoSeen = {};
  legs.forEach((leg, i) => {
    const cur = leg.isReturn ? depPt : legPoint(leg);
    const onsite = !leg.isReturn && i > 0 && prevLeg && !prevLeg.isReturn && prevLeg.norm === leg.norm && N.days > 1;
    const from = prev;
    // Zones à tension
    ap('tension');
    const tobj = { country: leg.country, cps: leg.allCps, cp: leg.cp, dept: leg.dept, lat: leg.lat, lon: leg.lon };
    const tExp = (leg.country && A.TENSION_RULES_BY_COUNTRY[leg.country]) ? A.tensionOf(tobj) : null;
    if(JSON.stringify(tExp) !== JSON.stringify(leg.tension === undefined ? null : leg.tension)) bad('tension', 'basse', 'leg.tension incohérent', { i });
    if(N.avoidTension && !leg.isReturn && tExp) bad('tension', 'haute', 'étape en zone à tension avec le filtre actif', { i, stop: leg.stop, level: tExp.level });
    // Restrictions : seulement van/moto
    ap('restrictions');
    if(leg.restrictions && N.transportKey !== 'van' && N.transportKey !== 'moto') bad('restrictions', 'moyenne', 'restrictions pour ' + N.transportKey);
    (leg.restrictions || []).forEach(r => {
      if(N.transportKey === 'van' && r.kind !== 'van') bad('restrictions', 'moyenne', 'restriction ' + r.kind + ' en van');
      if(N.transportKey === 'moto' && r.kind !== 'moto') bad('restrictions', 'moyenne', 'restriction ' + r.kind + ' en moto');
      if(r.type === 'lez' || r.type === 'ztl' || r.type === 'cityBan'){
        const rules = (r.kind === 'van' ? TD.VAN_RULES : TD.MOTO_RULES).filter(x => x.type === r.type && x.name === r.name && x.near);
        // Dans le cercle, ou dans la ville hôte de la zone (même pays, même nom, 15 km au plus : zoneHostNorm, 10e/11e audits).
        const inZone = (p, x) => hav(p.lat, p.lon, x.near.lat, x.near.lon) <= x.near.km + 0.01 ||
          (A.zoneHostNorm && p.country === x.country && A.placeNorm(p) === A.zoneHostNorm(x) && hav(p.lat, p.lon, x.near.lat, x.near.lon) <= 15);
        const inLeg = rules.some(x => inZone(Object.assign({ norm: leg.norm, stop: leg.stop }, leg), x));
        const inDep = i === 0 && rules.some(x => inZone(depPt, x));
        if(!inLeg && !inDep) bad('restrictions', 'moyenne', 'zone ' + r.type + ' ' + r.name + ' signalée hors zone', { i });
      }
      if(r.type === 'noMotorway' || r.type === 'noMotorwayCc'){
        if(motoSeen[r.country]) bad('restrictions', 'basse', 'interdiction moto ' + r.country + ' répétée');
        motoSeen[r.country] = true;
        if(r.country !== leg.country && r.country !== from.country) bad('restrictions', 'basse', 'interdiction moto ' + r.country + ' sans rapport avec le trajet', { i });
      }
    });
    if(N.transportKey === 'van' && (leg.distanceKm != null || leg.isReturn)){
      TD.VAN_RULES.filter(x => (x.type === 'lez' || x.type === 'ztl') && x.near && hav(leg.lat, leg.lon, x.near.lat, x.near.lon) <= x.near.km - 0.01).forEach(x => {
        if(!(leg.restrictions || []).some(r => r.type === x.type && r.name === x.name)) bad('restrictions', 'moyenne', 'zone van ' + x.name + ' non signalée', { i });
      });
    }

    // Dates et liens d'hébergement
    if(N.days > 1 && !leg.isReturn){
      ap('dates');
      const start = N.tripStart || new Date();
      const ci = isoDate(addDays(start, leg.dayNum - 1)), co = isoDate(addDays(start, leg.dayNum));
      if(leg.checkIn !== ci || leg.checkOut !== co) bad('dates', 'moyenne', 'checkIn/checkOut ' + leg.checkIn + '/' + leg.checkOut + ' ≠ ' + ci + '/' + co, { i });
      const st = stays.find(s => s.idx === i);
      if(st){
        const lco = isoDate(addDays(start, leg.dayNum - 1 + st.nights));
        if(leg.lodgingCheckIn !== ci || leg.lodgingCheckOut !== lco) bad('dates', 'moyenne', 'dates de logement ' + leg.lodgingCheckIn + '→' + leg.lodgingCheckOut + ' ≠ ' + ci + '→' + lco, { i });
        const L = leg.lodgingLinks || {};
        // Plafond de prix du pays de l'étape, dans la devise choisie si possible (lodgingPriceCap, partagé avec le client).
        let capObj = TD.lodgingPriceCap(leg.country, N.budgetKey, N.pc);
        // Devise du lien acceptée par Airbnb/Booking (LODGING_LINK_CURRENCIES), sinon celle du pays, sinon l'euro (11e audit).
        if(TD.LODGING_LINK_CURRENCIES && TD.LODGING_LINK_CURRENCIES.indexOf(capObj.currency) < 0){
          const local = TD.lodgingPriceCap(leg.country, N.budgetKey, null);
          capObj = TD.LODGING_LINK_CURRENCIES.indexOf(local.currency) >= 0 ? local : TD.lodgingPriceCap(leg.country, N.budgetKey, 'EUR');
        }
        const cur = capObj.currency, pm = capObj.max;
        if(!/^[A-Z]{3}$/.test(cur) || !(pm > 0)) bad('dates', 'moyenne', 'plafond de prix invalide ' + cur + ' ' + pm, { i });
        const rule = TD.LODGING_RULES && TD.LODGING_RULES[leg.country];
        if(!(rule && rule.airbnb === 'absent')){
          if(!L.airbnb || L.airbnb.indexOf('checkin=' + ci + '&checkout=' + lco) < 0 || L.airbnb.indexOf('price_max=' + pm + '&currency=' + cur) < 0) bad('dates', 'moyenne', 'lien Airbnb incohérent', { i, url: L.airbnb });
        } else if(L.airbnb) bad('dates', 'basse', 'lien Airbnb présent dans un pays où il est absent', { i });
        if(!(rule && rule.booking === 'absent')){
          if(!L.booking || L.booking.indexOf('checkin=' + ci + '&checkout=' + lco) < 0 || L.booking.indexOf('price%3D' + cur + '-0-' + pm) < 0) bad('dates', 'moyenne', 'lien Booking incohérent', { i });
        }
      } else if(leg.lodgingLinks || leg.lodgingCheckIn) bad('dates', 'basse', 'logement répété sur une nuit suivante', { i });
    }

    if(onsite){
      // Journée sur place (2e nuit et suivantes) : AUCUN trajet depuis le 10e audit (le « petit trajet local » tiré au
      // hasard était un chiffre inventé) — distance, durée, péage, recharge et ferry absents.
      ap('journeeSurPlace');
      if(leg.distanceKm !== null || leg.travelTime !== null || leg.travelMin !== null) bad('journeeSurPlace', 'moyenne', 'journée sur place avec un trajet (' + leg.distanceKm + ' km, ' + leg.travelTime + ')', { i });
      if(leg.tollInfo || leg.ferryInfo || leg.chargeInfo) bad('journeeSurPlace', 'moyenne', 'péage, ferry ou recharge sur une journée sur place', { i });
      if(leg.overMaxLeg) bad('maxLeg', 'moyenne', 'overMaxLeg sur une journée sur place', { i });
      prev = cur; prevLeg = leg; return;
    }

    // --- trajet entre deux lieux distincts
    const fromLm = A.landmassOf(from), toLm = A.landmassOf(cur);
    const fromZ = A.zoneOf(from), toZ = A.zoneOf(cur);
    const sea = A.seaCrossingFor(fromZ, toZ);
    const route = sea || (fromLm !== toLm ? A.ferryRouteFor(fromLm, toLm) : null);
    const isSingleReturn = leg.isReturn && stays.length === 1;
    const isFirst = i === 0;
    ap('ferry');
    if(leg.ferryInfo){
      ferryUsed = true;
      if(!N.ferry) bad('ferry', 'haute', 'ferry utilisé alors que ferryEnabled = false', { i });
      if(!route) bad('ferry', 'haute', 'ferry sans liaison entre ' + fromLm + ' et ' + toLm, { i });
      else {
        if(leg.ferryInfo.routeKey !== route.routeKey) bad('ferry', 'moyenne', 'routeKey ' + leg.ferryInfo.routeKey + ' ≠ ' + route.routeKey, { i });
        const amt = route.priceByClass ? route.priceByClass[N.ferryClass] : null;
        const expAmt = typeof amt === 'number' ? amt : null;
        if(leg.ferryInfo.amount !== expAmt) bad('ferry', 'moyenne', 'montant ferry ' + leg.ferryInfo.amount + ' ≠ ' + expAmt, { i });
        if(expAmt === null && ['variable', 'unknown'].indexOf(leg.ferryInfo.priceStatus) < 0) bad('ferry', 'basse', 'priceStatus absent', { i });
        if(leg.distanceKm !== route.distanceKm || leg.travelMin !== Math.round(route.durationH * 60)) bad('ferry', 'moyenne', 'distance/durée de traversée incohérentes', { i });
        if(labelMin(leg.travelTime) !== leg.travelMin) bad('durees', 'basse', 'travelTime ferry ' + leg.travelTime + ' ≠ ' + leg.travelMin, { i });
      }
    } else {
      if(route && fromLm !== toLm) bad('mer', 'haute', 'changement de masse terrestre ' + fromLm + ' → ' + toLm + ' sans ferry (liaison existante)', { i });
      else if(fromLm !== toLm) bad('mer', 'haute', 'changement de masse terrestre ' + fromLm + ' → ' + toLm + ' sans aucune liaison', { i });
      if(sea) bad('mer', 'haute', 'traversée entre zones ' + fromZ + '/' + toZ + ' sans ferry', { i });
    }

    // Frontières et mer (trajets par la route)
    if(!leg.ferryInfo){
      ap('frontiere');
      if(!A.reallyAdjacent(fromZ, toZ)) bad('frontiere', 'haute', 'frontière inexistante ' + fromZ + ' → ' + toZ, { i, from: from.name, to: cur.name });
      ap('mer');
      if(crossesSea(from, cur)) bad('mer', 'haute', 'trajet par la route à travers la mer', { i, from: [from.name, from.lat, from.lon], to: [cur.name, cur.lat, cur.lon], km: Math.round(hav(from.lat, from.lon, cur.lat, cur.lon)) });
    }
    let parts = null;
    if(leg.ferryInfo && route){
      const fs_ = sea ? fromZ : fromLm, ts_ = sea ? toZ : toLm;
      parts = A.ferryRoadParts(from, cur, fs_, ts_, route);
      ap('ferryRoadKm');
      if(leg.roadKm !== undefined && Math.abs(leg.roadKm - Math.round(parts.km)) > 1) bad('ferryRoadKm', 'basse', 'roadKm ' + leg.roadKm + ' ≠ ' + Math.round(parts.km), { i });
      if(parts.fromPort){
        ap('mer');
        if(crossesSea(from, parts.fromPort)) bad('mer', 'haute', 'partie routière vers le port à travers la mer', { i, from: from.name, port: parts.fromPort });
        if(crossesSea(parts.toPort, cur)) bad('mer', 'haute', 'partie routière depuis le port à travers la mer', { i, to: cur.name, port: parts.toPort });
      }
    }

    // Distance max entre étapes
    ap('maxLeg');
    const km = leg.ferryInfo ? (leg.roadKm !== undefined ? leg.roadKm : 0) : leg.distanceKm;
    if(!leg.ferryInfo){
      ap('distance');
      const expD = Math.round(road(from, cur));
      if(Math.abs(expD - leg.distanceKm) > 1) bad('distance', 'moyenne', 'distanceKm ' + leg.distanceKm + ' ≠ vol d\'oiseau × 1,287 = ' + expD, { i });
    }
    if(km > N.maxLeg + 0.5){
      const justified = N.minD > 0 && (isFirst || isSingleReturn) && km <= firstLegCap + 1;
      if(!leg.overMaxLeg) bad('maxLeg', 'haute', 'trajet de ' + km + ' km > maxLegKm ' + N.maxLeg + ' sans overMaxLeg', { i, isFirst, isReturn: !!leg.isReturn, stays: stays.length, ferry: !!leg.ferryInfo });
      else if(!justified) bad('maxLeg', 'haute', 'overMaxLeg injustifié (' + km + ' km, max ' + N.maxLeg + ', éloignement ' + N.minD + ')', { i, isFirst, isReturn: !!leg.isReturn, stays: stays.length, ferry: !!leg.ferryInfo, cap: Math.round(firstLegCap) });
      if(leg.overMaxLeg && (leg.overMaxLeg.max !== N.maxLeg || leg.overMaxLeg.min !== Math.round(N.minD))) bad('maxLeg', 'basse', 'overMaxLeg valeurs', { i });
    } else if(leg.overMaxLeg) bad('maxLeg', 'moyenne', 'overMaxLeg sur un trajet sous le maximum', { i });

    // Durées
    ap('durees');
    if(!leg.ferryInfo){
      const sp = speedOf(N, from, cur, A.tollCountryOf(cur));
      const expMin = Math.round(leg.distanceKm / sp * 60 + (leg.chargeInfo ? leg.chargeInfo.minutes : 0));
      if(Math.abs(leg.travelMin - expMin) > 1) bad('durees', 'moyenne', 'travelMin ' + leg.travelMin + ' ≠ ' + expMin, { i });
      if(labelMin(leg.travelTime) !== leg.travelMin) bad('durees', 'basse', 'travelTime ' + leg.travelTime + ' ≠ travelMin ' + leg.travelMin, { i });
    } else if(leg.roadKm !== undefined){
      // Parties routières d'un ferry : chacune à la vitesse de son pays (départ → port, port → arrivée).
      let expMin, sp;
      if(parts && parts.fromPort){
        const sp1 = speedOf(N, from, parts.fromPort, A.tollCountryOf(from)), sp2 = speedOf(N, parts.toPort, cur, A.tollCountryOf(cur));
        sp = Math.min(sp1, sp2);
        expMin = Math.round(parts.fromKm) / sp1 * 60 + Math.round(parts.toKm) / sp2 * 60 + (leg.chargeInfo ? leg.chargeInfo.minutes : 0);
      } else {
        sp = speedOf(N, null, null, A.tollCountryOf(cur));
        expMin = leg.roadKm / sp * 60 + (leg.chargeInfo ? leg.chargeInfo.minutes : 0);
      }
      const tol = 2 + 60 / sp;
      if(Math.abs(leg.roadMin - expMin) > tol) bad('durees', 'basse', 'roadMin ' + leg.roadMin + ' ≠ ' + expMin.toFixed(1) + ' (ferry, parties routières)', { i });
      if(labelMin(leg.roadTime) !== leg.roadMin) bad('durees', 'basse', 'roadTime ' + leg.roadTime + ' ≠ roadMin ' + leg.roadMin, { i });
    }

    // Péage
    ap('peage');
    if(leg.tollInfo){
      const t = leg.tollInfo;
      if(N.transportKey === 'velo') bad('peage', 'haute', 'péage à vélo', { i });
      if(t.enabled !== N.toll) bad('peage', 'basse', 'tollInfo.enabled ' + t.enabled + ' ≠ ' + N.toll, { i });
      (t.countries || []).forEach(c => {
        if(TOLL_COUNTRIES.indexOf(c) < 0) bad('peage', 'haute', 'péage dans un pays sans barème ' + c, { i });
        let segs = [[from, cur]];
        if(parts && parts.fromPort) segs = [[from, parts.fromPort], [parts.toPort, cur]];
        else if(leg.ferryInfo) segs = [];
        if(!segs.some(s => segHasTollCell(s[0], s[1], c))) bad('peage', 'haute', 'péage ' + c + ' sans voie à péage de ce pays sur le trajet', { i, from: from.name, to: cur.name });
      });
      // Pays du PÉAGE (11e audit) : un ferry Kitakyushu → Busan paie légitimement la route japonaise jusqu'au port,
      // même si les autoroutes coréennes de l'arrivée sont interdites aux motos.
      if(N.transportKey === 'moto' && (t.countries || []).some(fullBan)) bad('peage', 'moyenne', 'péage à moto dans un pays aux autoroutes interdites', { i });
      const base = leg.ferryInfo ? leg.roadKm : leg.distanceKm * 1.17 / ROAD;
      if(t.tolledKm > base + 1) bad('peage', 'moyenne', 'tolledKm ' + t.tolledKm + ' > distance facturable ' + base.toFixed(1), { i });
      const rates = (t.countries || []).map(c => (TD.TOLL_RATE_BY_COUNTRY[c] || {})[N.tollClass] || 0).filter(r => r > 0);
      if(rates.length){
        const lo = (t.tolledKm - 0.5) * Math.min(...rates) - 0.1, hi = (t.tolledKm + 0.5) * Math.max(...rates) + 0.1;
        if(t.amount < lo || t.amount > hi) bad('peage', 'moyenne', 'montant ' + t.amount + ' hors [' + lo.toFixed(1) + ',' + hi.toFixed(1) + ']', { i });
      }
      if(!(t.amount > 0)) bad('peage', 'moyenne', 'montant nul', { i });
      // Fourchette (11e audit) : borne basse ≤ borne haute, kilomètres de même.
      if(!(t.amountMin >= 0 && t.amountMin <= t.amount + 0.05)) bad('peage', 'moyenne', 'fourchette incohérente ' + t.amountMin + ' à ' + t.amount, { i });
      if(!(t.tolledKmMin >= 0 && t.tolledKmMin <= t.tolledKm + 1)) bad('peage', 'basse', 'tolledKmMin ' + t.tolledKmMin + ' > tolledKm ' + t.tolledKm, { i });
    }

    // Recharge (voiture électrique)
    ap('recharge');
    if(!N.electric && leg.chargeInfo) bad('recharge', 'moyenne', 'recharge hors voiture électrique', { i });
    if(N.electric){
      const c = leg.chargeInfo;
      if(c && c.stops > 0 && (typeof TD.EV_CHARGE_STOP_MIN === 'number' ? c.minutes !== c.stops * TD.EV_CHARGE_STOP_MIN : (c.minutes < 25 * c.stops || c.minutes > 40 * c.stops))) bad('recharge', 'basse', 'minutes de recharge ' + c.minutes + ' pour ' + c.stops + ' arrêts', { i });
      if(c && c.real && c.stops > 0 && (!c.stations || c.stations.length !== c.stops)) bad('recharge', 'basse', 'stations ≠ stops', { i });
      const arrivalHasCharger = A.chargerNear(cur.lat, cur.lon, 20);
      if(!!(c && c.noChargerNearArrival) !== !arrivalHasCharger) bad('recharge', 'basse', 'noChargerNearArrival incohérent', { i });
      if(!leg.ferryInfo){
        const airKm = hav(from.lat, from.lon, cur.lat, cur.lon);
        if(airKm > REACH_AIR + 0.01 && !(c && c.stops > 0)) bad('recharge', 'haute', 'trajet électrique de ' + leg.distanceKm + ' km sans arrêt de recharge', { i });
        if(airKm <= REACH_AIR - 0.01 && c && c.stops > 0) bad('recharge', 'basse', 'arrêt de recharge sur un trajet sous l\'autonomie', { i });
        if(c && c.real && c.stations && c.stations.length){
          let p = from;
          c.stations.forEach((s, k) => {
            if(segMinDist(s, from, cur, 1) > 15.5) bad('recharge', 'moyenne', 'borne ' + k + ' à ' + segMinDist(s, from, cur, 1).toFixed(1) + ' km de la ligne', { i });
            if(hav(p.lat, p.lon, s.lat, s.lon) > REACH_AIR + 0.5) bad('recharge', 'haute', 'écart entre bornes > autonomie', { i });
            p = s;
          });
          if(hav(p.lat, p.lon, cur.lat, cur.lon) > REACH_AIR + 0.5) bad('recharge', 'haute', 'dernière borne trop loin de l\'arrivée', { i });
        }
      }
    }
    prev = cur; prevLeg = leg;
  });

  // Moto : chaque pays aux autoroutes interdites traversé a son avertissement
  if(N.transportKey === 'moto'){
    ap('restrictions');
    const countries = new Set([dep.country].concat(legs.map(l => l.country)));
    countries.forEach(cc => { if(A.motoMotorwayBan(cc) && !motoSeen[cc]) bad('restrictions', 'moyenne', 'pays ' + cc + ' aux autoroutes interdites aux motos sans avertissement'); });
  }
  ap('notices');
  const notices = res.notices || [];
  if((N.transportKey === 'van') !== notices.includes('van.notice')) bad('notices', 'basse', 'van.notice incohérent');
  if(N.electric !== notices.includes('charge.dataNote')) bad('notices', 'basse', 'charge.dataNote incohérent');
  if(!N.ferry && ferryUsed) bad('ferry', 'haute', 'ferry malgré ferryEnabled=false');

  // Premier trajet > 6 h : 2 nuits si une autre étape peut en céder une
  if(N.days > 1){
    ap('reposPremierTrajet');
    const fl = legs[0];
    const h = labelMin(fl.ferryInfo ? fl.roadTime : fl.travelTime) / 60;
    if(h > 6 && stays[0].nights < 2 && N.maxDays >= 2 && N.days - 1 >= 2){
      const donor = stays.slice(1).some(s => s.nights > N.minDays);
      if(donor) bad('reposPremierTrajet', 'basse', 'premier trajet de ' + h.toFixed(1) + ' h, 1 nuit, alors qu\'une autre étape a plus que le minimum', { nights: stays.map(s => s.nights) });
    }
  }
  ap('spinPool');
  if(!Array.isArray(res.spinPool) || res.spinPool.length > 40) bad('spinPool', 'basse', 'spinPool invalide');
  return { v, applied, empty: false, stays: stays.length };
}

module.exports = { ROOT, TD, LG, TG, load, get engine(){ return engine; }, mulberry32, withSeed, hav, road, depObj, byCountry, findPlace, dep,
  crossesSea, labelMin, normParams, check, stateIsReset, timeBudgetMs, TOLL_COUNTRIES };
