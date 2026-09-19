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
  // Au-delà, le plafond annoncé est celui du pays : 4,5 h × 80 km/h × facteur français, pas 360.
  const r = runSteady(base(H.dep('Lyon', 'FR'), { minDistanceKm: 480 }), 1);
  assert.equal(r.minDistanceUnreachable, true);
  assert.equal(r.returnCapKm, Math.floor(4.5 * 80 * E.__test.countrySpeedFactor(H.dep('Lyon', 'FR'), null, 'FR')));
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
  // Stuttgart → Sardaigne par Gênes : Suisse ; Bratislava → Italie par Livourne : Autriche et Slovénie (graines de l'audit).
  const expect = [['Stuttgart', 'DE', 1, ['CH']], ['Bratislava', 'SK', 1, ['AT', 'SI']]];
  for(const [name, cc, seed, want] of expect){
    const r = runSteady(base(H.dep(name, cc), p), seed);
    const ferries = r.legs.filter(l => l.ferryInfo);
    assert.ok(ferries.length, name + ' : aucun ferry tiré (graine à revoir)');
    const crossed = new Set([].concat(...ferries.map(l => l.countriesCrossed || [])));
    for(const c of want) assert.ok(crossed.has(c), name + ' : ' + c + ' absent des pays traversés ' + JSON.stringify([...crossed]));
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
    assert.equal(x.returnCapKm, 67, d.name + ' : plafond vélo ' + x.returnCapKm);
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
