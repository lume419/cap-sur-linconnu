// Régressions du moteur trouvées au 12e audit (19/09/2026) : un test par défaut corrigé, pour qu'une passe suivante
// ne les retrouve pas. Chacun reproduit le cas de l'audit (lieux, paramètres, graine) et vérifie le résultat attendu.
//   - vitesse du pays appliquée seulement sur la masse terrestre mesurée : aucune île ni outre-mer au-dessus de 80 km/h ;
//   - aller-retour dans la journée à la vitesse du pays (Lyon 380 km possible ; Oulan-Bator diagnostiqué) ;
//   - nouveaux essais « éloignement introuvable » : le diagnostic du premier tirage n'est pas remplacé par « délai dépassé » ;
//   - pays traversés par les parties routières d'un ferry (rappels de vignette) ;
//   - moto : interdiction d'autoroute d'un pays seulement traversé, signalée ;
//   - péage : borne haute jamais arrondie à « ~0 € ».
'use strict';
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const H = require('./helpers/engine.js');

let E, I;
before(async () => {
  E = await H.load();
  I = E.internals;
});

const base = (d, extra) => Object.assign({ departureCity: d, days: 1, budgetKey: 'moyen', transportKey: 'voiture-thermique', tollEnabled: true,
  ferryEnabled: true, avoidTent: false, avoidTension: true, tripStart: '2026-10-01' }, extra || {});
const run = (p, seed) => H.withSeed(seed, () => E.generateTrip(p));
// Tirage indépendant de la charge de la machine : horloge ralentie ×10 (budget de 4 s → 40 s réelles), sinon un tirage
// fait sous charge (autres tests en parallèle) s'arrête plus tôt et la même graine donne un autre voyage.
function runSteady(p, seed){
  const realNow = Date.now, t0 = realNow();
  Date.now = () => t0 + (realNow() - t0) / 10;
  try { return run(p, seed); } finally { Date.now = realNow; }
}
const P = (name, cc) => { const p = H.findPlace(name, cc); assert.ok(p, 'lieu introuvable : ' + name + ' (' + cc + ')'); return p; };
function avgSpeed(a, b){
  const km = Math.round(H.hav(a.lat, a.lon, b.lat, b.lon) * 1.287);
  const leg = I.finalizeLeg(km, 80, 'voiture-thermique', true, b.country, a, b);
  return km / (leg.travelMin / 60);
}

test('îles et outre-mer : vitesse du mode, jamais celle du continent (≤ 80 km/h de moyenne)', () => {
  // Relevé du 12e audit avant correction : 96,7 / 93,9 / 93,5 / ~90 km/h.
  const cases = [['Mamoudzou', 'Kani-Kéli', 'FR'], ['Bastia', 'Ajaccio', 'FR'], ['Saint-Denis', 'Saint-Pierre', 'FR'],
    ['Palma', 'Manacor', 'ES'], ['Sassari', 'Cagliari', 'IT'], ['Sapporo', 'Asahikawa', 'JP']];
  const bad = [];
  for(const [a, b, cc] of cases){
    const v = avgSpeed(P(a, cc), P(b, cc));
    if(v > 80.5) bad.push(a + ' → ' + b + ' : ' + v.toFixed(1) + ' km/h');
  }
  assert.deepEqual(bad, []);
  // Témoin : le continent garde sa vitesse mesurée (France ~94 km/h), sinon la correction aurait tout annulé.
  assert.ok(avgSpeed(P('Lyon', 'FR'), P('Marseille', 'FR')) > 88, 'vitesse du continent français perdue');
});

test('aller-retour dans la journée : plafond à la vitesse du pays', () => {
  // Lyon, 380 km d'éloignement : 8,1 h aller-retour à la vitesse française — refusé avant (plafond 360 km à 80 km/h).
  for(const seed of [1, 2, 3]){
    const r = runSteady(base(H.dep('Lyon', 'FR'), { minDistanceKm: 380 }), seed);
    assert.ok(!r.minDistanceUnreachable, 'Lyon 380 km annoncé hors de portée (graine ' + seed + ')');
  }
  // Au-delà, le plafond annoncé suit la vitesse du pays (~424 km en France, pas 360) ; depuis le 14e audit, c'est la
  // distance du plus lointain lieu atteignable, à quelques km près de ce plafond théorique.
  const r = runSteady(base(H.dep('Lyon', 'FR'), { minDistanceKm: 480 }), 1);
  assert.equal(r.minDistanceUnreachable, true);
  const theo = Math.floor(4.5 * 80 * E.__test.countrySpeedFactor(H.dep('Lyon', 'FR'), null, 'FR'));
  assert.ok(r.returnCapKm > 380 && r.returnCapKm < 480, 'plafond annoncé ' + r.returnCapKm + ' km (théorique France ' + theo + ')');
  // Oulan-Bator (~41 km/h), 250 km : tirage vide AVEC un diagnostic (rien n'était dit avant).
  const ub = runSteady(base(H.dep('Ulaanbaatar', 'MN') || H.dep('Ulan Bator', 'MN'), { minDistanceKm: 250 }), 1);
  assert.equal(ub.legs.length, 0);
  assert.ok(ub.minDistanceUnreachable || ub.minDistanceNotFound, 'tirage vide sans diagnostic : ' + JSON.stringify(Object.keys(ub)));
});

test('nouveaux essais : « éloignement introuvable » reste le diagnostic, pas « délai dépassé »', () => {
  // Puli (Taïwan), 1 500 km d'éloignement sans ferry : le premier tirage conclut en ~2,7 s, un nouvel essai manquait de temps.
  // Horloge simulée pour ne pas dépendre de la vitesse de la machine : le temps est figé jusqu'à ce que le premier tirage
  // pose son diagnostic, puis saute de 10 s — tout nouvel essai manque alors de temps, comme dans le cas de l'audit.
  const realNow = Date.now, t0 = realNow();
  let late = false;
  Date.now = () => { if(!late && E.__test.state().LAST_TRIP_DIAGNOSTIC) late = true; return t0 + (late ? 10000 : 0); };
  let r;
  try { r = run(base(H.dep('Puli', 'TW'), { days: 8, ferryEnabled: false, maxRadiusKm: 3000, minDistanceKm: 1500 }), 70104); }
  finally { Date.now = realNow; }
  assert.ok(late, 'le premier tirage n\'a posé aucun diagnostic (cas à revoir)');
  assert.equal(r.legs.length, 0);
  assert.ok(!r.timedOut, 'diagnostic « délai dépassé » au lieu d\'« éloignement introuvable »');
  assert.ok(r.minDistanceNotFound || r.minDistanceUnreachable, 'aucun diagnostic');
});

test('ferry : pays traversés par les parties routières (rappels de vignette)', () => {
  const p = { days: 12, maxRadiusKm: 1500, maxLegKm: 1500, minDistanceKm: 700, maxDistanceKm: 1500, minDaysPerCity: 2, maxDaysPerCity: 3 };
  // Stuttgart → Sardaigne par Gênes : la Suisse est traversée. Bratislava : le port choisi dépend du temps total depuis le
  // 16e audit (route + traversée), donc on vérifie qu'un pays de TRANSIT est bien calculé, sans figer lequel.
  const expect = [['Stuttgart', 'DE', 1, ['CH']], ['Bratislava', 'SK', 1, []]];
  for(const [name, cc, seed, want] of expect){
    const r = runSteady(base(H.dep(name, cc), p), seed);
    const ferries = r.legs.filter(l => l.ferryInfo);
    assert.ok(ferries.length, name + ' : aucun ferry tiré (graine à revoir)');
    const crossed = new Set([].concat(...ferries.map(l => l.countriesCrossed || [])));
    for(const c of want) assert.ok(crossed.has(c), name + ' : ' + c + ' absent des pays traversés ' + JSON.stringify([...crossed]));
    // Au moins un pays de transit (ni le départ ni l'arrivée d'une étape) : le calcul des pays traversés fonctionne.
    const ends = new Set([cc].concat(r.legs.map(l => l.country)));
    assert.ok([...crossed].some(c => !ends.has(c)), name + ' : aucun pays de transit ' + JSON.stringify([...crossed]));
  }
});

test('moto : pays seulement traversé aux autoroutes interdites, appliqué (trajet entre deux pays)', () => {
  // Nanning (Chine) → Luang Prabang (Laos) : le trait traverse le nord du Viêt Nam (autoroutes interdites aux motos).
  // (Le cas du 12e audit, Kota Bharu → Bukit Kayu Hitam, était un trajet intérieur malaisien : voir le test du 13e audit.)
  const a = P('Nanning', 'CN'), b = P('Luang Prabang', 'LA');
  assert.ok(E.__test.countriesAlong(a, b).includes('VN'), 'Viêt Nam absent des pays traversés : ' + JSON.stringify(E.__test.countriesAlong(a, b)));
  const km = Math.round(H.hav(a.lat, a.lon, b.lat, b.lon) * 1.287);
  const moto = I.finalizeLeg(km, 80, 'moto', true, 'LA', a, b), car = I.finalizeLeg(km, 80, 'voiture-thermique', true, 'LA', a, b);
  assert.ok(moto.travelMin > car.travelMin, 'moto non ralentie par l\'interdiction vietnamienne (' + moto.travelMin + ' / ' + car.travelMin + ' min)');
});

test('péage : jamais « jusqu\'à ~0 € » (borne haute arrondie au dixième > 0)', () => {
  // Balayage de trajets courts près des voies à péage : tout tollInfo a une borne haute ≥ 0,1 €.
  const bad = [];
  for(const cc of ['FR', 'IT', 'ES', 'PT', 'JP']){
    const list = (H.byCountry().get(cc) || []).filter(c => c.pop > 5000).slice(0, 400);
    for(let i = 0; i + 1 < list.length; i += 2){
      const a = list[i], b = list[i + 1], km = Math.round(H.hav(a.lat, a.lon, b.lat, b.lon) * 1.287);
      if(km > 60) continue;
      const leg = I.finalizeLeg(km, 90, 'voiture-thermique', true, b.country, a, b);
      if(leg.tollInfo && !(leg.tollInfo.amount >= 0.1)) bad.push(a.name + ' → ' + b.name + ' : ' + leg.tollInfo.amount);
    }
  }
  assert.deepEqual(bad, []);
});

// ------------------------------------------------------------------ 13e audit (19/09/2026) : régressions du 12e audit
test('13e audit : vélo, aller-retour dans la journée à 15 km/h partout (jamais la vitesse routière du pays)', () => {
  // Oulan-Bator, 40 km : 2 h 40 par trajet à vélo, possible — annoncé « hors de portée, 34 km » au 12e audit.
  const ub = H.dep('Ulaanbaatar', 'MN') || H.dep('Ulan Bator', 'MN');
  const r = runSteady(base(ub, { transportKey: 'velo', minDistanceKm: 40, maxDistanceKm: 60, avoidTension: false }), 1);
  assert.ok(!r.minDistanceUnreachable, 'Oulan-Bator à vélo, 40 km : annoncé hors de portée (' + r.returnCapKm + ' km)');
  // Plafond identique partout : 4,5 h × 15 km/h = 67 km (Paris comme Oulan-Bator).
  for(const d of [H.dep('Paris', 'FR'), ub]){
    const x = runSteady(base(d, { transportKey: 'velo', minDistanceKm: 90, avoidTension: false }), 1);
    assert.equal(x.minDistanceUnreachable, true, d.name + ' : 90 km à vélo devrait être hors de portée');
    // 4,5 h × 15 km/h = 67 km au plus ; annoncé : le plus lointain lieu atteignable (14e audit), donc ≤ 67.
    assert.ok(x.returnCapKm > 50 && x.returnCapKm <= 67, d.name + ' : plafond vélo ' + x.returnCapKm);
  }
});

test('13e audit : îles des pays lents jamais plus rapides que leur continent mesuré', () => {
  const cases = [['Cebu City', 'Bogo', 'PH', 'Manila', 'Baguio'], ['Naha', 'Nago', 'JP', 'Tokyo', 'Nagoya'], ['Denpasar', 'Singaraja', 'ID', 'Jakarta', 'Bandung']];
  const bad = [];
  for(const [a, b, cc, ma, mb] of cases){
    const pa = H.findPlace(a, cc), pb = H.findPlace(b, cc);
    if(!pa || !pb) { bad.push('introuvable : ' + a + ' / ' + b); continue; }
    const island = avgSpeed(pa, pb), f = E.__test.countrySpeedFactor(H.findPlace(ma, cc), H.findPlace(mb, cc), cc);
    if(island > 80 * Math.min(1, f) + 0.5) bad.push(a + ' → ' + b + ' : ' + island.toFixed(1) + ' km/h (continent × ' + f.toFixed(3) + ')');
  }
  assert.deepEqual(bad, []);
});

test('13e audit : aller-retour dans la journée calculé en moins de 600 ms (Paris, rayon 600 km)', () => {
  // 12e audit : ~1,1 s (masse terrestre du départ recalculée pour chaque candidat), contre ~0,15 s avant.
  const t0 = Date.now();
  runSteady(base(H.dep('Paris', 'FR'), { maxRadiusKm: 600 }), 3);
  const ms = Date.now() - t0;
  assert.ok(ms < 600, 'aller-retour Paris : ' + ms + ' ms');
});

test('13e audit : électrique et moto, aller-retour impossible diagnostiqué « hors de portée », sans nouveaux essais', () => {
  // Paris en électrique, 400 km : une recharge de 28 min par trajet, ~9,4 h aller-retour. Séoul à moto (autoroutes
  // interdites), 260 km : limite réelle ~237 km.
  for(const [d, mode, km] of [[H.dep('Paris', 'FR'), 'voiture-electrique', 400], [H.dep('Seoul', 'KR') || H.dep('Seoul-si', 'KR'), 'moto', 260]]){
    const t0 = Date.now();
    const r = run(base(d, { transportKey: mode, minDistanceKm: km, avoidTension: false }), 1);
    assert.equal(r.minDistanceUnreachable, true, d.name + ' ' + mode + ' ' + km + ' km : ' + JSON.stringify(Object.keys(r)));
    assert.ok(Date.now() - t0 < 1500, d.name + ' : ' + (Date.now() - t0) + ' ms');
  }
});

test('13e audit : moto, trajet intérieur jamais averti pour un pays seulement longé', () => {
  // Kangar → Melor (Malaisie → Malaisie) : le trait longe la Thaïlande, la route reste malaisienne.
  const a = P('Kangar', 'MY'), b = P('Melor', 'MY');
  const km = Math.round(H.hav(a.lat, a.lon, b.lat, b.lon) * 1.287);
  const moto = I.finalizeLeg(km, 80, 'moto', true, 'MY', a, b), car = I.finalizeLeg(km, 80, 'voiture-thermique', true, 'MY', a, b);
  const fMY = E.__test.countrySpeedFactor(a, b, 'MY');
  // Vitesse de la moto = celle de la voiture (aucune interdiction en Malaisie), pas le facteur thaïlandais.
  assert.equal(moto.travelMin, car.travelMin, 'moto ralentie sur un trajet intérieur malaisien (facteur ' + fMY + ')');
});

// ------------------------------------------------------------------ 14e audit (19/09/2026)
test('14e audit : aller-retour près d\'un pays plus rapide, distance annoncée = plus lointain lieu atteignable', () => {
  // Bamako : « hors de portée, 196 km » alors qu'un aller-retour de 261 km vers la Guinée fonctionnait.
  const bamako = H.dep('Bamako', 'ML');
  const ok = runSteady(base(bamako, { minDistanceKm: 250, avoidTension: false }), 1);
  assert.ok(!ok.minDistanceUnreachable, 'Bamako 250 km annoncé hors de portée (' + ok.returnCapKm + ' km)');
  const far = runSteady(base(bamako, { minDistanceKm: 600, avoidTension: false }), 1);
  assert.equal(far.minDistanceUnreachable, true);
  assert.ok(far.returnCapKm >= 250, 'plafond annoncé ' + far.returnCapKm + ' km, sous un aller-retour faisable (~261 km)');
  // Le plafond annoncé doit lui-même être faisable : un tirage À cette distance trouve un itinéraire (15e audit : la
  // contre-épreuve à X − 5 laissait passer un plafond infaisable).
  const at = runSteady(base(bamako, { minDistanceKm: far.returnCapKm, avoidTension: false }), 1);
  assert.ok(at.legs.length > 0, 'plafond annoncé ' + far.returnCapKm + ' km, mais aucun itinéraire à cette distance');
});

test('14e audit : aller-retour avec une distance max ou une étape max sous 15 km', () => {
  // Lyon, 1 jour, 10 km au plus : tirage vide sans explication (plancher fixe de 15 km).
  const r = runSteady(base(H.dep('Lyon', 'FR'), { maxDistanceKm: 10 }), 1);
  assert.ok(r.legs.length > 0, 'Lyon 1 jour, 10 km max : aucun lieu (' + JSON.stringify(Object.keys(r)) + ')');
  assert.ok(r.legs[0].distanceKm <= 10.5, 'étape à ' + r.legs[0].distanceKm + ' km pour 10 km max');
});

test('14e audit : moto, partie routière vers un port dans le même pays sans transit', () => {
  // Kota Bharu → Kuala Perlis (port de Langkawi) : la route reste malaisienne ; le port sans pays faisait passer ce trajet
  // pour un trajet entre deux pays (interdiction thaïlandaise appliquée).
  const a = P('Kota Bharu', 'MY');
  const port = { lat: 6.3997, lon: 100.1297 }; // Kuala Perlis
  const km = Math.round(H.hav(a.lat, a.lon, port.lat, port.lon) * 1.287);
  const withCountry = I.finalizeLeg(km, 80, 'moto', true, 'MY', a, Object.assign({ country: 'MY' }, port));
  const car = I.finalizeLeg(km, 80, 'voiture-thermique', true, 'MY', a, Object.assign({ country: 'MY' }, port));
  assert.equal(withCountry.travelMin, car.travelMin, 'moto ralentie sur une route intérieure vers le port');
});

// ------------------------------------------------------------------ 15e audit (19/09/2026)
test('15e audit : chaque « hors de portée, X km » d\'un aller-retour est faisable à X km (tous modes)', () => {
  // Lewe (Birmanie) en électrique annonçait 328 km pour 221 faisables : redemander à X renvoyait X − 1, 109 fois.
  const cases = [['Lewe', 'MM', 'voiture-electrique', 344], ['Xarardheere', 'SO', 'voiture-electrique', 434], ['Jasdan', 'IN', 'moto', 377],
    ['Lyon', 'FR', 'voiture-thermique', 480], ['Paris', 'FR', 'velo', 90], ['Bamako', 'ML', 'voiture-thermique', 600]];
  const bad = [];
  for(const [n, cc, mode, km] of cases){
    const d = H.dep(n, cc); if(!d){ bad.push('introuvable ' + n); continue; }
    const r = runSteady(base(d, { transportKey: mode, minDistanceKm: km, avoidTension: false }), 1);
    if(!r.minDistanceUnreachable) continue;
    const again = runSteady(base(d, { transportKey: mode, minDistanceKm: r.returnCapKm, avoidTension: false }), 1);
    if(!again.legs.length) bad.push(n + ' ' + mode + ' : X = ' + r.returnCapKm + ' annoncé, infaisable (' + JSON.stringify(Object.keys(again)) + ' ' + (again.returnCapKm || '') + ')');
  }
  assert.deepEqual(bad, []);
});

test('15e audit : aller-retour et zones à tension (filtre actif)', () => {
  // Moscou 600 km : « introuvable » au lieu de « hors de portée » (14e passe) ; Sharm el-Sheikh à moto 190 km : « hors
  // de portée » alors que seul le filtre des zones bloquait.
  const moscou = runSteady(base(H.dep('Moscow', 'RU') || H.dep('Moskva', 'RU'), { minDistanceKm: 600 }), 1);
  assert.equal(moscou.minDistanceUnreachable, true, 'Moscou 600 km : ' + JSON.stringify(Object.keys(moscou)));
  const sharm = runSteady(base(H.dep('Sharm el-Sheikh', 'EG') || H.dep('Sharm ash Shaykh', 'EG'), { transportKey: 'moto', minDistanceKm: 190 }), 1);
  assert.ok(!sharm.minDistanceUnreachable, 'Sharm el-Sheikh 190 km : « hors de portée » alors que le filtre des zones bloque');
});

test('15e audit : aller-retour depuis une très petite île, sans éloignement', () => {
  const d = H.dep('Jamestown', 'SH');
  assert.ok(d, 'Jamestown introuvable');
  const r = runSteady(base(d, {}), 1);
  assert.ok(r.legs.length > 0 || r.minDistanceNotFound || r.minDistanceUnreachable, 'tirage vide sans explication : ' + JSON.stringify(Object.keys(r)));
});

test('15e audit : ferry, paire de ports éloignée de la ligne de référence estimée (jamais la durée ni le prix d\'une autre ligne)', () => {
  const A = E.__test;
  const hop = (a, b) => {
    const la = A.landmassOf(a), lb = A.landmassOf(b), route = A.ferryRouteFor(la, lb);
    assert.ok(route, 'aucune liaison ' + la + ' ↔ ' + lb);
    return A.finalizeFerryLeg('voiture-thermique', route, A.ferryRoadParts(a, b, la, lb, route), 80, true, a, b);
  };
  // Gênes → Palerme : ligne de référence = détroit de Messine (8 km, 24 min, grille Caronte).
  const gp = hop(P('Genova', 'IT'), P('Palermo', 'IT'));
  assert.ok(gp.distanceKm > 300, 'Gênes → Palerme : traversée de ' + gp.distanceKm + ' km');
  assert.equal(gp.ferryInfo.amount, null, 'prix de la ligne de Messine appliqué');
  assert.equal(gp.ferryInfo.durationEstimated, true);
  // Témoin : la ligne de référence elle-même garde ses données publiées.
  const vm = hop(P('Villa San Giovanni', 'IT'), P('Messina', 'IT'));
  assert.ok(vm.distanceKm < 20 && typeof vm.ferryInfo.amount === 'number', 'Messine : données publiées perdues (' + vm.distanceKm + ' km, ' + vm.ferryInfo.amount + ')');
});

// ------------------------------------------------------------------ 16e audit (20/09/2026)
test('16e audit : la distance annoncée est la PLUS GRANDE faisable, pas la première trouvée', () => {
  // 15e audit : 24 essais seulement, le premier succès devenait X — Leganes annonçait 161 km alors que 199 km marche,
  // Calumboyan 109 pour 208 (écart jusqu'à 172 km sur 10 % des cas).
  const cases = [['Leganes', 'PH', 'voiture-thermique', 237, 199], ['Calumboyan', 'PH', 'voiture-electrique', 457, 196]];
  const bad = [];
  for(const [n, cc, mode, km, feasible] of cases){
    const d = H.dep(n, cc); if(!d){ bad.push('introuvable ' + n); continue; }
    const r = runSteady(base(d, { transportKey: mode, minDistanceKm: km, avoidTension: false }), 1);
    if(!r.minDistanceUnreachable) continue;
    // Un itinéraire existe à `feasible` km : la distance annoncée ne peut pas être plus basse.
    const ok = runSteady(base(d, { transportKey: mode, minDistanceKm: feasible, avoidTension: false }), 1);
    // Depuis le 17e audit le balayage est exhaustif : la distance annoncée est le maximum, sans tolérance.
    if(ok.legs.length && r.returnCapKm < feasible) bad.push(n + ' : ' + r.returnCapKm + ' km annoncés alors que ' + feasible + ' km donne un itinéraire');
  }
  assert.deepEqual(bad, []);
});

test('16e audit : ferry, aucune autre paire de ports de route comparable n\'est plus rapide au total', () => {
  // Une paire de ports était choisie au plus court PAR LA ROUTE : depuis que chaque paire porte sa propre durée de
  // traversée (15e audit), gagner 20 km de route pouvait coûter des heures de mer (Reggio Calabria, Malte, Åland).
  const A = E.__test, PORTS = require('../lib/ferry-ports.js');
  const MARGE = 150; // même marge que le moteur (FERRY_PAIR_ROAD_MARGIN_KM)
  const bad = [];
  const check = (from, to) => {
    const la = A.landmassOf(from), lb = A.landmassOf(to);
    const route = A.ferryRouteFor(la, lb);
    if(!route) return false;
    const key = [la, lb].sort().join('|'), ports = PORTS[key];
    if(!ports || !ports[la] || !ports[lb]) return false;
    const parts = A.ferryRoadParts(from, to, la, lb, route);
    if(!parts || !parts.fromPort) return false;
    const leg = A.finalizeFerryLeg('voiture-thermique', route, parts, 80, true, from, to);
    const roadOf = (p, q) => H.hav(p.lat, p.lon, q[0], q[1]) * 1.287;
    const chosenRoad = parts.fromKm + parts.toKm;
    const chosenH = chosenRoad / 80 + leg.travelMin / 60;
    let pairs = [];
    if(ports.pairs) pairs = ports.pairs.map(pr => key.split('|')[0] === la ? [pr[0], pr[1]] : [pr[1], pr[0]]);
    else ports[la].forEach((_, i) => ports[lb].forEach((__, j) => pairs.push([i, j])));
    pairs.forEach(([i, j]) => {
      if(!(i < ports[la].length && j < ports[lb].length)) return;
      const road = roadOf(from, ports[la][i]) + roadOf(to, ports[lb][j]);
      if(road > chosenRoad + MARGE) return;
      const alt = A.ferryRoadParts(from, to, la, lb, route); // mêmes ports possibles ; on rejoue la paire i,j à la main
      const seaKm = H.hav(ports[la][i][0], ports[la][i][1], ports[lb][j][0], ports[lb][j][1]);
      const altRoute = A.ferryRouteForPair(route, { pairSeaKm: seaKm, refSeaKm: parts.refSeaKm });
      const h = road / 80 + altRoute.durationH;
      if(h < chosenH - 0.5) bad.push((from.name || '?') + ' → ' + (to.name || '?') + ' : choisi ' + chosenH.toFixed(1) + ' h (' + leg.distanceKm + ' km de mer), possible ' + h.toFixed(1) + ' h (' + Math.round(seaKm) + ' km de mer, ' + Math.round(road) + ' km de route)');
    });
  };
  // Noms exacts de la base (17e audit : « Reggio di Calabria » et « Irakleio » ne correspondaient à aucun lieu utile —
  // deux des huit cas ne s'exécutaient donc jamais, dont celui que le commentaire cite en exemple).
  const cases = [['Reggio Calabria', 'IT', 'Messina', 'IT'], ['Napoli', 'IT', 'Palermo', 'IT'], ['Valletta', 'MT', 'Catania', 'IT'],
    ['Dublin', 'IE', 'Liverpool', 'GB'], ['Mariehamn', 'AX', 'Stockholm', 'SE'], ['Barcelona', 'ES', 'Palma', 'ES'],
    ['Marseille', 'FR', 'Bastia', 'FR'], ['Athína', 'GR', 'Chaniá', 'GR']];
  let joues = 0;
  for(const [n1, c1, n2, c2] of cases){
    const p1 = H.findPlace(n1, c1), p2 = H.findPlace(n2, c2);
    assert.ok(p1 && p2, 'lieu introuvable : ' + n1 + ' / ' + n2);
    if(check(p1, p2) !== false) joues++;
  }
  // Sans ce garde-fou, un test qui ne compare plus aucune paire passerait à vide (17e audit).
  assert.ok(joues >= 6, 'seulement ' + joues + ' cas joués sur ' + cases.length);
  assert.deepEqual(bad, []);
});

test('16e audit : péage d\'une étape avec traversée cohérent avec ses kilomètres (un seul arrondi)', () => {
  // Deux parties routières déjà arrondies au dixième donnaient un total faux (2,2 € pour 28 km à 0,084 €/km).
  const bad = [];
  for(const seed of [1600348628, 1, 7, 42]){
    const r = runSteady(base(H.dep('Reggio Calabria', 'IT') || H.dep('Reggio di Calabria', 'IT'),
      { days: 3, transportKey: 'moto', minDistanceKm: 300, maxLegKm: 60, maxRadiusKm: 1000, avoidTension: false }), seed);
    r.legs.filter(l => l.tollInfo && l.ferryInfo).forEach(l => {
      const t = l.tollInfo, exp = t.tolledKm * t.rate;
      if(!(t.amount >= exp - 0.15 && t.amount <= exp + 0.15)) bad.push('graine ' + seed + ' : ' + t.amount + ' € pour ' + t.tolledKm + ' km à ' + t.rate + ' €/km');
      if(t.amountExact !== undefined) bad.push('champ interne amountExact envoyé au client');
    });
  }
  assert.deepEqual(bad, []);
});

test('17e audit : l\'index de recherche est refusé quand le normalisateur de noms a changé', () => {
  // La 16e passe a modifié normalizeCityName (retrait des liants U+200C/U+200D) sans invalider l'index déjà construit :
  // ses clés ne correspondaient plus aux requêtes et 3 416 alias persans, ourdous et bengalis sont devenus introuvables,
  // sans le moindre avertissement. meta.json porte désormais une empreinte du normalisateur, comparée à l'ouverture.
  const SI = require('../lib/search-index.js');
  const vraie = SI.normSignature(E.__test);
  assert.ok(vraie && vraie.length > 5, 'empreinte du normalisateur vide');
  // Un normalisateur qui garde les liants (l'ancien comportement) doit donner une empreinte DIFFÉRENTE.
  const ancien = { normalizeCityName: function(x){ return String(x).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[-'’]/g, ' ').replace(/\s+/g, ' ').trim(); } };
  assert.notEqual(SI.normSignature(ancien), vraie, 'un normalisateur différent donne la même empreinte : l\'index périmé resterait accepté');
  // Et l'empreinte est stable d'un appel à l'autre (sinon l'index serait reconstruit à chaque démarrage).
  assert.equal(SI.normSignature(E.__test), vraie);
});

test('17e audit : « hors de portée, X km » dit s’il a conclu — X exact, ou plafond approché assumé', () => {
  // La distance annoncée vient d'un balayage BORNÉ par un budget de temps (DAY_REACH_MS et le budget du tirage). Quand
  // il va au bout, X est le maximum exact et la campagne d'invariants l'exige (contre-épreuve à X + 5 km). Quand le
  // budget tombe au milieu, un filet échantillonne le reste et X n'est plus qu'un minorant : Tallinn en van
  // (graine 1002629) annonçait 276 km pour 299 faisables lors de la campagne, et le même tirage rend 298 km sur un
  // moteur chaud. Sans le drapeau, la contre-épreuve aurait échoué sur la CHARGE de la machine ; avec un drapeau
  // toujours vrai, elle aurait cessé de contrôler quoi que ce soit. Ce test verrouille les DEUX branches.
  const p = base({ name: 'Tallinn', cp: '10153', lat: 59.437, lon: 24.7535, dept: 'Tallinn', country: 'EE', allCps: ['10153'] },
    { transportKey: 'van', budgetKey: 'confortable', avoidTent: true, tripStart: '2026-10-02',
      maxRadiusKm: 300, minDistanceKm: 600, maxDistanceKm: 3000, minDaysPerCity: 1, maxDaysPerCity: 3, preferredCurrency: 'JPY' });
  const SEED = 1002629;
  run(p, SEED); // chauffe : le tout premier tirage d'un processus est assez lent pour épuiser le budget du balayage

  // 1. Balayage mené à son terme : X est le maximum, et X + 5 km ne donne plus rien.
  const r = run(p, SEED);
  assert.equal(r.minDistanceUnreachable, true, 'Tallinn 600 km : ' + JSON.stringify(Object.keys(r)));
  assert.equal(r.returnCapExact, true, 'balayage non conclu sur un moteur chaud (cap ' + r.returnCapKm + ')');
  assert.ok(run(Object.assign({}, p, { minDistanceKm: r.returnCapKm }), SEED).legs.length > 0, 'X annoncé (' + r.returnCapKm + ' km) infaisable');
  assert.equal(run(Object.assign({}, p, { minDistanceKm: r.returnCapKm + 5 }), SEED).legs.length, 0,
    'X + 5 km donne encore un itinéraire : X (' + r.returnCapKm + ') n\'est pas le maximum');

  // 2. Budget épuisé pendant le balayage : le moteur le DIT (returnCapExact false) et n'annonce plus qu'un minorant.
  // Un bond unique de +2 s est posé sur le n-ième appel à Date.now() du tirage ; entre le calcul de l'échéance du
  // balayage et sa première vérification, il le coupe net. Le rang dépend du chemin de code, pas de la machine : il est
  // donc reproductible, mais il se déplace si le moteur change — d'où le balayage de rangs ci-dessous plutôt qu'une
  // valeur en dur (mesuré le 20/09/2026 : 17 900 à 18 400).
  const vrai = Date.now;
  let approche = null;
  for(let k = 16000; k <= 20000 && !approche; k += 200){
    let n = 0;
    Date.now = () => { n++; return vrai() + (n > k ? 2000 : 0); };
    let rk = null;
    try { rk = run(p, SEED); } catch(e){ rk = null; } finally { Date.now = vrai; }
    if(rk && rk.minDistanceUnreachable && rk.returnCapExact === false) approche = rk;
  }
  assert.ok(approche, 'aucun rang de 16 000 à 20 000 ne coupe le balayage : le drapeau returnCapExact ne peut plus être faux ' +
    '(soit il est figé à vrai — la contre-épreuve de la campagne ne contrôlerait plus rien —, soit le chemin de code a changé ' +
    'et la plage de rangs est à revoir)');
  // Un plafond approché reste un MINORANT utilisable : jamais au-dessus du maximum, et toujours faisable.
  assert.ok(approche.returnCapKm > 0 && approche.returnCapKm <= r.returnCapKm,
    'plafond approché ' + approche.returnCapKm + ' km au-dessus du maximum ' + r.returnCapKm + ' km');
  assert.ok(run(Object.assign({}, p, { minDistanceKm: approche.returnCapKm }), SEED).legs.length > 0,
    'plafond approché (' + approche.returnCapKm + ' km) infaisable');
});

test('18e audit : antiméridien — une étape à cheval sur 180° n\'invente pas de pays traversé', () => {
  // Défaut trouvé au 18e audit : « to.lon - from.lon » vaut ~349° au lieu de ~-11° pour une étape à cheval sur
  // l'antiméridien, et le trait échantillonné faisait le tour du globe. Une étape de 594 km INTERNE à la Tchoukotka
  // annonçait « Finlande traversée » ; d'autres annonçaient l'Islande, le Canada, les États-Unis, la Suède. Pire,
  // distToSegmentKm mesurait la distance d'une zone de restriction à ce segment fantôme : un rappel de restriction
  // ISLANDAISE (routes F du Hálendi) se posait sur un trajet arctique russe.
  const pt = (c, cc) => ({ lat: c.lat, lon: c.lon, country: cc });
  const couples = [['Vilyuneyskaya', 'Sireniki'], ['Vayegi', 'Vankarem'], ['Vayegi', 'Nunligran'],
    ['Beringovskiy', 'Vankarem'], ['Lamutskoye', 'Nunligran'], ['Vilyuneyskaya', 'Vankarem']];
  const bad = [];
  for(const [a, b] of couples){
    const A = P(a, 'RU'), B = P(b, 'RU');
    const cc = H.engine.__test.countriesAlong({ lat: A.lat, lon: A.lon, country: 'RU' }, { lat: B.lat, lon: B.lon, country: 'RU' });
    const étrangers = cc.filter(x => x !== 'RU');
    if(étrangers.length) bad.push(a + ' → ' + b + ' : ' + JSON.stringify(cc));
  }
  assert.deepEqual(bad, []);
  // Témoins : un VRAI franchissement de frontière doit continuer d'être vu, sinon la correction aurait tout éteint.
  assert.deepEqual(H.engine.__test.countriesAlong(pt(P('Lyon', 'FR'), 'FR'), pt(P('Torino', 'IT'), 'IT')), ['FR', 'IT']);
  assert.deepEqual(H.engine.__test.countriesAlong(pt(P('Paris', 'FR'), 'FR'), pt(P('Milano', 'IT'), 'IT')).sort(), ['CH', 'FR', 'IT']);
});

test('18e audit : antiméridien — la distance d\'un point à un segment ne fait pas le tour du globe', () => {
  // distToSegmentKm sert à décider si une zone de restriction (route, tunnel, col) touche une étape. Sur un segment
  // à cheval sur 180°, il mesurait ~349° de large au lieu de ~11° : n'importe quel point du globe pouvait s'en
  // trouver « proche ». Contrôle : un segment tchouktche, et un point islandais à la même latitude.
  const seg = { aLat: 64.5, aLon: 175.0, bLat: 64.5, bLon: -175.0 }; // 10° de large en passant par 180°
  const islande = { lat: 64.85, lon: -18.5 };                        // centre de la règle « routes F » du Hálendi
  const d = H.engine.__test.distToSegmentKm(islande.lat, islande.lon, seg.aLat, seg.aLon, seg.bLat, seg.bLon);
  assert.ok(d > 3000, 'l\'Islande est à ' + Math.round(d) + ' km d\'un segment tchouktche : le segment fait encore le tour du globe');
  // Un point AU MILIEU du segment, lui, doit être à quelques kilomètres — sinon le calcul ne mesure plus rien.
  const milieu = H.engine.__test.distToSegmentKm(64.5, 180, seg.aLat, seg.aLon, seg.bLat, seg.bLon);
  assert.ok(milieu < 5, 'le milieu du segment en est à ' + Math.round(milieu) + ' km');
  // Témoin sans antiméridien : inchangé par la correction (Lyon, segment Paris–Marseille).
  const témoin = H.engine.__test.distToSegmentKm(45.76, 4.84, 48.85, 2.35, 43.30, 5.37);
  assert.ok(témoin > 50 && témoin < 200, 'témoin continental : ' + Math.round(témoin) + ' km');
});

test('18e audit : paire de ports choisie à la vitesse du MODE, pas à 80 km/h en dur', () => {
  // Le 16e audit a introduit le choix de la paire de ports sur le TEMPS total (route + traversée) et son commentaire
  // annonçait « vitesse routière : celle du mode ». Le code prenait 80 km/h quel que soit le transport : à vélo
  // (15 km/h), les kilomètres de route étaient valorisés 5,3 fois trop vite, et le moteur troquait jusqu'à 150 km de
  // route contre des heures de mer. Pire que la durée : l'étape était ensuite REFUSÉE par legAllowed, ses 112 km de
  // route dépassant le plafond d'étape du vélo (80 km par défaut) — alors qu'une paire à 0 km de route existe.
  const I = H.engine.__test;
  const cas = [['Valletta', 'MT', 'Catania', 'IT'], ['Mariehamn', 'AX', 'Stockholm', 'SE'], ['Dublin', 'IE', 'Liverpool', 'GB']];
  const bad = [];
  for(const [a, ca, b, cb] of cas){
    const A = P(a, ca), B = P(b, cb);
    const fromLm = I.landmassOf(A), toLm = I.landmassOf(B);
    const route = I.ferryRouteFor(fromLm, toLm);
    assert.ok(route, a + ' → ' + b + ' : aucune liaison de ferry');
    const velo = I.ferryRoadParts({ lat: A.lat, lon: A.lon }, { lat: B.lat, lon: B.lon }, fromLm, toLm, route, 15);
    const auto = I.ferryRoadParts({ lat: A.lat, lon: A.lon }, { lat: B.lat, lon: B.lon }, fromLm, toLm, route, 90);
    if(!(velo.km <= 80)) bad.push(a + ' → ' + b + ' à vélo : ' + Math.round(velo.km) + ' km de route (plafond d\'étape 80)');
    if(!(velo.km <= auto.km)) bad.push(a + ' → ' + b + ' : le vélo prend plus de route que la voiture (' + Math.round(velo.km) + ' / ' + Math.round(auto.km) + ')');
  }
  assert.deepEqual(bad, []);
  // Témoin : en voiture, la paire retenue ne change pas (c'est le gain du 16e audit qu'il ne faut pas perdre).
  const rc = P('Reggio Calabria', 'IT') || P('Reggio di Calabria', 'IT'), me = P('Messina', 'IT');
  const lmA = I.landmassOf(rc), lmB = I.landmassOf(me);
  const r = I.ferryRouteFor(lmA, lmB);
  if(r){
    const p = I.ferryRoadParts({ lat: rc.lat, lon: rc.lon }, { lat: me.lat, lon: me.lon }, lmA, lmB, r, 90);
    assert.ok(p.km < 40, 'détroit de Messine en voiture : ' + Math.round(p.km) + ' km de route');
  }
});
