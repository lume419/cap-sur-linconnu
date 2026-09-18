// Temps de tirage du moteur sur des cas représentatifs (Math.random à graine), comparés à des seuils EXPLICITES.
// Les durées dépendent de la machine : seuils larges, pensés pour détecter une régression nette (x2 et plus, ou
// explosion de la part de tirages coupés par le budget de temps — réponse `timedOut`, étapes vides).
//   TEST_PERF_REP  tirages par départ et par cas (4 par défaut, 10 avec TEST_FULL=1)
// À lancer sur une machine peu chargée (npm test exécute les fichiers de test l'un après l'autre).
'use strict';
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const H = require('./helpers/engine.js');
const { FULL, num } = require('./helpers/config.js');

const REP = num('TEST_PERF_REP', FULL ? 10 : 4);

// Seuils
const LIMITS = {
  strictFerry: { timedOutMax: 0.05, medianMs: 2500 },   // intérieurs, ferries cochés, maxLegKm < éloignement
  ordinary: { timedOutMax: 0, medianMs: 400, p90Ms: 2000 }, // réglages par défaut du formulaire
  heavy: { overBudgetMs: 1500 },                          // pire cas : jamais plus que budget + 1,5 s
};

let E;
before(async () => { E = await H.load(); });

const D = {
  Prague: { name: 'Prague', cp: '11000', lat: 50.0755, lon: 14.4378, dept: 'Praha', country: 'CZ' },
  Lyon: { name: 'Lyon', cp: '69001', lat: 45.7578, lon: 4.832, dept: '69', country: 'FR' },
  Madrid: { name: 'Madrid', cp: '28001', lat: 40.4168, lon: -3.7038, dept: 'Madrid', country: 'ES' },
  Munich: { name: 'Munich', cp: '80331', lat: 48.137, lon: 11.575, dept: 'Bayern', country: 'DE' },
  Clermont: { name: 'Clermont-Ferrand', cp: '63000', lat: 45.7772, lon: 3.087, dept: '63', country: 'FR' },
  Berlin: { name: 'Berlin', cp: '10115', lat: 52.52, lon: 13.405, dept: 'Berlin', country: 'DE' },
  Bastia: { name: 'Bastia', cp: '20200', lat: 42.7028, lon: 9.4503, dept: '2B', country: 'FR' },
};

function measure(deps, cases, seedBase){
  const a = { n: 0, empty: 0, timedOut: 0, ms: [], worst: null };
  cases.forEach((c, ci) => {
    for(const d0 of deps){
      const d = typeof d0 === 'function' ? d0() : d0;
      for(let k = 0; k < REP; k++){
        const params = Object.assign({ departureCity: d, budgetKey: 'moyen', tollEnabled: true, ferryEnabled: true, avoidTent: false, avoidTension: true, tripStart: '2026-10-01' }, c);
        const t0 = Date.now();
        const r = H.withSeed(seedBase + ci * 1000 + k, () => E.generateTrip(params));
        const ms = Date.now() - t0;
        a.n++; a.ms.push(ms);
        if(!r.legs.length){ a.empty++; if(r.timedOut) a.timedOut++; }
        if(!a.worst || ms > a.worst.ms) a.worst = { ms, dep: d.name, case: c.id };
      }
    }
  });
  a.ms.sort((x, y) => x - y);
  a.median = a.ms[a.ms.length >> 1];
  a.p90 = a.ms[Math.floor(a.ms.length * 0.9)];
  a.max = a.ms[a.ms.length - 1];
  a.summary = 'n=' + a.n + ' vides=' + a.empty + ' timedOut=' + a.timedOut + ' (' + (100 * a.timedOut / a.n).toFixed(1) + ' %) médiane=' + a.median + ' ms p90=' + a.p90 + ' ms max=' + a.max + ' ms (' + a.worst.case + ', ' + a.worst.dep + ')';
  return a;
}

test('départs intérieurs, ferries cochés, maxLegKm < éloignement : moins de ' + LIMITS.strictFerry.timedOutMax * 100 + ' % de timedOut', { timeout: 30 * 60000 }, t => {
  const cases = [
    { id: '1 jour 50/200', days: 1, transportKey: 'voiture-thermique', maxLegKm: 50, minDistanceKm: 200, maxDistanceKm: 0 },
    { id: '3 jours 60/250', days: 3, transportKey: 'voiture-thermique', maxLegKm: 60, minDistanceKm: 250, maxDistanceKm: 500 },
    { id: '5 jours vélo 40/120', days: 5, transportKey: 'velo', maxLegKm: 40, minDistanceKm: 120, maxDistanceKm: 300 },
  ];
  const a = measure([D.Prague, D.Lyon, D.Madrid, D.Munich, D.Clermont], cases, 7000);
  t.diagnostic(a.summary);
  assert.ok(a.timedOut / a.n < LIMITS.strictFerry.timedOutMax, 'part de timedOut ' + (100 * a.timedOut / a.n).toFixed(1) + ' % ≥ ' + LIMITS.strictFerry.timedOutMax * 100 + ' % — ' + a.summary);
  assert.ok(a.median <= LIMITS.strictFerry.medianMs, 'médiane ' + a.median + ' ms > ' + LIMITS.strictFerry.medianMs + ' ms — ' + a.summary);
});

test('tirages ordinaires (réglages par défaut) : médiane ≤ ' + LIMITS.ordinary.medianMs + ' ms, p90 ≤ ' + LIMITS.ordinary.p90Ms + ' ms, aucun timedOut', { timeout: 30 * 60000 }, t => {
  const cases = [
    { id: '7 jours voiture', days: 7, transportKey: 'voiture-thermique' },
    { id: '5 jours électrique', days: 5, transportKey: 'voiture-electrique' },
    { id: '4 jours vélo', days: 4, transportKey: 'velo' },
    { id: '10 jours moto', days: 10, transportKey: 'moto' },
  ];
  const deps = [D.Lyon, D.Berlin, D.Madrid, D.Bastia, () => H.dep('Tokyo', 'JP'), () => H.dep('New York City', 'US')];
  const a = measure(deps, cases, 8000);
  t.diagnostic(a.summary);
  assert.ok(a.timedOut / a.n <= LIMITS.ordinary.timedOutMax, 'timedOut sur des réglages ordinaires — ' + a.summary);
  assert.ok(a.median <= LIMITS.ordinary.medianMs, 'médiane ' + a.median + ' ms > ' + LIMITS.ordinary.medianMs + ' ms — ' + a.summary);
  assert.ok(a.p90 <= LIMITS.ordinary.p90Ms, 'p90 ' + a.p90 + ' ms > ' + LIMITS.ordinary.p90Ms + ' ms — ' + a.summary);
});

test('pires cas connus : le budget de temps du moteur est respecté (≤ budget + ' + LIMITS.heavy.overBudgetMs + ' ms)', { timeout: 30 * 60000 }, t => {
  const budget = H.timeBudgetMs();
  const cases = [
    { id: 'Tokyo électrique 21 j 3000 km', dep: () => H.dep('Tokyo', 'JP'), days: 21, transportKey: 'voiture-electrique', maxRadiusKm: 3000, maxLegKm: 1000 },
    { id: 'Moscou éloignement 3000 km', dep: () => H.dep('Moscow', 'RU'), days: 21, minDistanceKm: 3000, maxRadiusKm: 3000, maxLegKm: 3000 },
    { id: 'Nuuk 21 j 3000 km sans ferry', dep: () => H.dep('Nuuk', 'GL'), days: 21, maxRadiusKm: 3000, ferryEnabled: false, avoidTension: false },
    { id: 'Kinshasa électrique 14 j maxLeg 5', dep: () => H.dep('Kinshasa', 'CD'), days: 14, transportKey: 'voiture-electrique', maxLegKm: 5 },
    { id: 'Lyon vélo 21 j 1 nuit/ville', dep: () => D.Lyon, days: 21, transportKey: 'velo', maxDaysPerCity: 1 },
  ];
  const lines = [], bad = [];
  cases.forEach((c, ci) => {
    const params = Object.assign({ departureCity: c.dep(), budgetKey: 'moyen', tollEnabled: true, ferryEnabled: true, avoidTension: true, tripStart: '2026-10-01' }, c);
    delete params.dep; delete params.id;
    let max = 0;
    for(let k = 0; k < Math.max(2, REP >> 1); k++){
      const t0 = Date.now();
      H.withSeed(9000 + ci * 100 + k, () => E.generateTrip(params));
      max = Math.max(max, Date.now() - t0);
    }
    lines.push(c.id + ' : max ' + max + ' ms');
    if(max > budget + LIMITS.heavy.overBudgetMs) bad.push(c.id + ' : ' + max + ' ms > ' + (budget + LIMITS.heavy.overBudgetMs));
  });
  t.diagnostic(lines.join(' | '));
  assert.deepEqual(bad, []);
});
