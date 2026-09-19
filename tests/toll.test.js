// Péages : calcul réel du moteur (internals.finalizeLeg, le code utilisé par chaque étape) sur des paires de lieux.
// Modèle en FOURCHETTE depuis le 11e audit (19/09/2026) : amountMin = borne basse « probable », amount = amountMax = borne
// haute « possible » (voir tolledParts, lib/toll-grid.js). Chaque test dit laquelle il contrôle :
//   - borne HAUTE à 0 : trajets intérieurs d'un pays sans barème (aucune voie à péage de ce pays n'existe) ;
//   - borne BASSE à 0 : transits possibles mais incertains (Alsace, pays voisins) et autoroutes GRATUITES réelles
//     (liste de référence ci-dessous — c'est ce que les 38 liaisons payantes ne mesuraient jamais) ;
//   - borne BASSE > 0 : grands corridors payants ; prix officiel DANS la fourchette pour les liaisons de référence.
//   - pays SANS barème : aucun trajet facturé, qu'il soit intérieur ou transfrontalier entre deux pays sans barème,
//     y compris quand le trait à vol d'oiseau traverse un pays à péage (Allemagne <-> Allemagne par l'Alsace…) ;
//   - Croatie <-> Croatie : jamais facturé au barème bosnien (le trait longe ou coupe la Bosnie, la route non) ;
//   - 38 liaisons françaises de référence (public/data/toll-reference.json) : médiane estimé/officiel dans [0,85 ; 1,15] ;
//   - témoins : trajets qui DOIVENT être facturés (sinon une « correction » qui supprime tout péage passerait) et
//     trajets qui ne doivent pas l'être.
//   TEST_TOLL_PAIRS  paires aléatoires par pays (40 par défaut, 300 avec TEST_FULL=1)
'use strict';
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const H = require('./helpers/engine.js');
const { FULL, num } = require('./helpers/config.js');

const PAIRS = num('TEST_TOLL_PAIRS', FULL ? 300 : 40);
const TOLL = new Set(H.TOLL_COUNTRIES);
let E, I;

before(async () => {
  E = await H.load();
  I = E.internals;
});

// Montant facturé par le moteur pour une étape A -> B en voiture (classe 1), péage coché.
function toll(a, b){
  const km = Math.round(H.hav(a.lat, a.lon, b.lat, b.lon) * 1.287);
  const leg = I.finalizeLeg(km, 90, 'voiture-thermique', true, b.country, a, b);
  return leg.tollInfo ? { amount: leg.tollInfo.amount, min: leg.tollInfo.amountMin, countries: leg.tollInfo.countries.slice(), km }
    : { amount: 0, min: 0, countries: [], km };
}
const fmt = (a, b, t) => (a.name || '?') + ' (' + a.country + ') → ' + (b.name || '?') + ' (' + b.country + ') ' + t.km + ' km : ' + t.min + ' à ' + t.amount + ' € [' + t.countries.join('+') + ']';

// Lieux d'un pays (population minimale), tirés des données du moteur.
function places(cc, minPop){
  return (H.byCountry().get(cc) || []).filter(c => c.pop >= minPop).map(c => ({ name: c.name, lat: c.lat, lon: c.lon, country: c.country }));
}
// Paires aléatoires à graine entre deux listes, distance à vol d'oiseau dans [minKm, maxKm].
function randomPairs(L1, L2, n, minKm, maxKm, seed){
  const R = H.mulberry32(seed);
  const out = [];
  let tries = 0;
  while(out.length < n && tries++ < n * 400 && L1.length && L2.length){
    const a = L1[Math.floor(R() * L1.length)], b = L2[Math.floor(R() * L2.length)];
    const d = H.hav(a.lat, a.lon, b.lat, b.lon);
    if(d >= minKm && d <= maxKm) out.push([a, b]);
  }
  return out;
}

const NO_TOLL = ['DE', 'CH', 'AT', 'BE', 'NL', 'LU', 'SI', 'HU', 'CZ', 'SK', 'PL', 'DK', 'AL', 'ME', 'XK', 'BG', 'RO', 'GB', 'IE', 'MC', 'SM', 'AD', 'LI'];
const MICRO = new Set(['MC', 'SM', 'AD', 'LI', 'LU']);

test('liste des pays sans barème à jour (aucun n\'a reçu de barème entre-temps)', () => {
  const now = NO_TOLL.filter(cc => TOLL.has(cc));
  assert.deepEqual(now, [], 'pays passés à péage : retirer de NO_TOLL dans tests/toll.test.js');
});

test('pays sans barème : aucun trajet intérieur facturé (' + PAIRS + ' paires aléatoires par pays)', () => {
  const bad = [];
  let n = 0;
  NO_TOLL.forEach((cc, k) => {
    const L = places(cc, MICRO.has(cc) ? 0 : 2000);
    // Micro-État : au moins 3 km ; autres : 50 à 300 km (au-delà du minimum de facturation de 60 km routiers).
    for(const [a, b] of randomPairs(L, L, PAIRS, MICRO.has(cc) ? 3 : 50, 300, 1000 + k)){
      n++;
      const t = toll(a, b);
      if(t.amount > 0.05) bad.push(fmt(a, b, t));
    }
  });
  assert.ok(n > PAIRS * 10, 'trop peu de paires testées : ' + n);
  assert.equal(bad.length, 0, bad.length + ' trajet(s) facturé(s) sur ' + n + ' :\n  ' + bad.slice(0, 15).join('\n  '));
});

// Pays voisins tous deux sans barème. Exclus volontairement : les couples dont le trajet réel emprunte souvent une
// autoroute à péage d'un pays tiers (DE-LU par l'A4 lorraine, AT-SI par l'A23 italienne, HU-SI par l'A4 croate) — le
// péage de transit y est légitime. DE-CH reste : par l'Alsace, les autoroutes (A35, A36 est) sont gratuites.
const NEIGHBOURS = [['DE', 'AT'], ['DE', 'CZ'], ['DE', 'PL'], ['DE', 'NL'], ['DE', 'BE'], ['DE', 'DK'], ['DE', 'CH'], ['AT', 'CZ'], ['AT', 'SK'],
  ['AT', 'HU'], ['AT', 'CH'], ['AT', 'LI'], ['CH', 'LI'], ['CZ', 'PL'], ['CZ', 'SK'], ['SK', 'HU'], ['SK', 'PL'], ['BE', 'NL'], ['BE', 'LU'], ['RO', 'BG'], ['GB', 'IE']];
test('pays sans barème : aucun trajet transfrontalier facturé entre deux pays sans barème', () => {
  const bad = [];
  let n = 0;
  NEIGHBOURS.forEach(([c1, c2], k) => {
    const L1 = places(c1, MICRO.has(c1) ? 0 : 2000), L2 = places(c2, MICRO.has(c2) ? 0 : 2000);
    for(const [a, b] of randomPairs(L1, L2, PAIRS, 50, 300, 2000 + k)){
      n++;
      const t = toll(a, b);
      if(t.min > 0.05) bad.push(fmt(a, b, t)); // un transit par un pays à péage reste POSSIBLE (borne haute), jamais probable
    }
  });
  assert.equal(bad.length, 0, bad.length + ' trajet(s) facturé(s) sur ' + n + ' :\n  ' + bad.slice(0, 15).join('\n  '));
});

const Pt = (name, lat, lon, country) => ({ name, lat, lon, country });
test('transit : Allemagne <-> Allemagne ou Suisse par l\'Alsace jamais facturé au barème français', () => {
  const cases = [
    [Pt('Saarbrücken', 49.2354, 6.9969, 'DE'), Pt('Freiburg', 47.999, 7.842, 'DE')],
    [Pt('Saarbrücken', 49.2354, 6.9969, 'DE'), Pt('Lörrach', 47.6156, 7.6614, 'DE')],
    [Pt('Karlsruhe', 49.0069, 8.4037, 'DE'), Pt('Freiburg', 47.999, 7.842, 'DE')],
    [Pt('Zweibrücken', 49.2466, 7.3697, 'DE'), Pt('Offenburg', 48.4708, 7.9408, 'DE')],
    [Pt('Saarbrücken', 49.2354, 6.9969, 'DE'), Pt('Basel', 47.5596, 7.5886, 'CH')],
    [Pt('Pirmasens', 49.2008, 7.6053, 'DE'), Pt('Müllheim', 47.808, 7.63, 'DE')],
  ];
  const bad = cases.map(([a, b]) => [a, b, toll(a, b)]).filter(x => x[2].min > 0.05).map(x => fmt(...x));
  assert.deepEqual(bad, []);
});

test('transit : Croatie <-> Croatie jamais facturé au barème bosnien (' + PAIRS * 4 + ' paires aléatoires + cas connus)', () => {
  const HR = places('HR', 1000);
  const pairs = randomPairs(HR, HR, PAIRS * 4, 60, 450, 3001).concat([
    [Pt('Split', 43.5081, 16.4402, 'HR'), Pt('Dubrovnik', 42.6507, 18.0944, 'HR')],
    [Pt('Osijek', 45.555, 18.6955, 'HR'), Pt('Split', 43.5081, 16.4402, 'HR')],
    [Pt('Zadar', 44.1194, 15.2314, 'HR'), Pt('Osijek', 45.555, 18.6955, 'HR')],
    [Pt('Slavonski Brod', 45.16, 18.0156, 'HR'), Pt('Dubrovnik', 42.6507, 18.0944, 'HR')],
    [Pt('Metković', 43.0544, 17.6481, 'HR'), Pt('Dubrovnik', 42.6507, 18.0944, 'HR')],
    [Pt('Knin', 44.0406, 16.1994, 'HR'), Pt('Vukovar', 45.3511, 19.0028, 'HR')],
  ]);
  const bad = [];
  for(const [a, b] of pairs){
    const t = toll(a, b);
    if(t.countries.some(c => c !== 'HR')) bad.push(fmt(a, b, t));
  }
  assert.equal(bad.length, 0, bad.length + ' trajet(s) facturé(s) à un barème étranger sur ' + pairs.length + ' :\n  ' + bad.slice(0, 15).join('\n  '));
});

test('38 liaisons françaises de référence : médiane estimé/officiel entre 0,85 et 1,15', t => {
  const ref = JSON.parse(fs.readFileSync(path.join(H.ROOT, 'public', 'data', 'toll-reference.json'), 'utf8'));
  const norm = E.__test.normalizeCityName;
  const fr = new Map();
  for(const c of H.byCountry().get('FR')){ const o = fr.get(c.norm); if(!o || c.pop > o.pop) fr.set(c.norm, c); }
  const ratios = [], missing = [], zeros = [], outOfRange = [];
  for(const l of ref.links){
    const ends = l.label.split('→').map(x => x.replace(/\(.*?\)/g, '').trim());
    const a = fr.get(norm(ends[0])), b = fr.get(norm(ends[ends.length - 1]));
    if(!a || !b){ missing.push(l.label); continue; }
    const r = toll(Pt(a.name, a.lat, a.lon, 'FR'), Pt(b.name, b.lat, b.lon, 'FR'));
    ratios.push(r.amount / l.c1);
    if(r.amount === 0) zeros.push(l.label);
    if(!(l.c1 >= r.min * 0.8 && l.c1 <= r.amount * 1.25)) outOfRange.push(l.label + ' : ' + r.min + ' à ' + r.amount + ' € pour ' + l.c1 + ' €');
  }
  ratios.sort((x, y) => x - y);
  const m = ratios.length >> 1, med = ratios.length % 2 ? ratios[m] : (ratios[m - 1] + ratios[m]) / 2;
  t.diagnostic(ratios.length + ' liaisons, médiane ' + med.toFixed(3) + ', q25 ' + ratios[Math.floor(ratios.length * 0.25)].toFixed(2) + ', q75 ' + ratios[Math.floor(ratios.length * 0.75)].toFixed(2) + (missing.length ? ', introuvables : ' + missing.join(', ') : ''));
  assert.ok(ratios.length >= 30, 'liaisons retrouvées : ' + ratios.length + ' (introuvables : ' + missing.join(', ') + ')');
  assert.ok(med >= 0.85 && med <= 1.15, 'médiane ' + med.toFixed(3) + ' hors [0,85 ; 1,15]');
  assert.deepEqual(zeros, [], 'liaisons estimées à 0 €');
  // Limite connue (README, 11e audit) : le trait à vol d'oiseau s'écarte de l'A9 et de l'A61 le long du golfe du Lion, la
  // borne haute sous-estime alors (Lyon → Montpellier, Montpellier → Le Perthus, Montpellier → Toulouse, Toulouse → Le Perthus,
  // Lyon → Le Perthus, Bordeaux → Toulouse → Montpellier) ; Auxerre → Paris est surestimé. Au plus 20 % des liaisons.
  assert.ok(outOfRange.length <= Math.floor(ratios.length * 0.2), 'prix officiel hors de la fourchette (tolérance −20 % / +25 %) pour ' +
    outOfRange.length + ' liaisons :\n  ' + outOfRange.join('\n  '));
});

// Autoroutes et voies rapides GRATUITES longeant des autoroutes payantes (11e audit : 16 trajets gratuits sur 20 étaient
// facturés en France, 5 sur 6 au Portugal, 7 sur 8 en Italie). Borne basse attendue : 0 € ; la borne haute peut signaler
// un péage POSSIBLE à proximité.
test('autoroutes gratuites : borne basse à 0 €', () => {
  const G = [
    ['Lyon', 45.764, 4.8357, 'Saint-Étienne', 45.4397, 4.3872, 'FR'], ['Metz', 49.1193, 6.1757, 'Nancy', 48.6921, 6.1844, 'FR'],
    ['Strasbourg', 48.5734, 7.7521, 'Mulhouse', 47.7508, 7.3359, 'FR'], ['Caen', 49.1829, -0.3707, 'Rennes', 48.1173, -1.6778, 'FR'],
    ['Nantes', 47.2184, -1.5536, 'Rennes', 48.1173, -1.6778, 'FR'], ['Toulouse', 43.6047, 1.4442, 'Albi', 43.9289, 2.1464, 'FR'],
    ['Clermont-Ferrand', 45.7772, 3.087, 'Millau', 44.0986, 3.0778, 'FR'], ['Bordeaux', 44.8378, -0.5792, 'Arcachon', 44.6586, -1.1689, 'FR'],
    ['Lille', 50.6292, 3.0573, 'Valenciennes', 50.3579, 3.5234, 'FR'], ['Limoges', 45.8336, 1.2611, 'Brive', 45.1586, 1.5321, 'FR'],
    ['Aix-en-Provence', 43.5297, 5.4474, 'Marseille', 43.2965, 5.3698, 'FR'], ['Paris', 48.8566, 2.3522, 'Meaux', 48.9601, 2.8788, 'FR'],
    ['Lille', 50.6292, 3.0573, 'Arras', 50.291, 2.7775, 'FR'], ['Lyon', 45.764, 4.8357, 'Vienne', 45.5256, 4.8744, 'FR'],
    ['Faro', 37.0194, -7.9304, 'Lagos', 37.1028, -8.6742, 'PT'], ['Guarda', 40.5373, -7.2675, 'Aveiro', 40.6405, -8.6538, 'PT'],
    ['Viseu', 40.6566, -7.9125, 'Vila Real', 41.3006, -7.7441, 'PT'], ['Porto', 41.1579, -8.6291, 'Viana do Castelo', 41.6918, -8.8344, 'PT'],
    ['Palermo', 38.1157, 13.3615, 'Catania', 37.5079, 15.083, 'IT'], ['Firenze', 43.7696, 11.2558, 'Siena', 43.3188, 11.3308, 'IT'],
    ['Bari', 41.1171, 16.8719, 'Taranto', 40.4644, 17.247, 'IT'], ['Salerno', 40.6824, 14.7681, 'Cosenza', 39.2983, 16.2536, 'IT'],
    ['Madrid', 40.4168, -3.7038, 'Barcelona', 41.3874, 2.1686, 'ES'], ['Barcelona', 41.3874, 2.1686, 'València', 39.4699, -0.3763, 'ES'],
    ['Madrid', 40.4168, -3.7038, 'Sevilla', 37.3891, -5.9845, 'ES'], ['Madrid', 40.4168, -3.7038, 'Toledo', 39.8628, -4.0273, 'ES'],
    ['Haifa', 32.794, 34.9896, 'Nazareth', 32.6996, 35.3035, 'IL']
  ];
  const bad = [];
  for(const [n1, la1, lo1, n2, la2, lo2, cc] of G){
    const a = Pt(n1, la1, lo1, cc), b = Pt(n2, la2, lo2, cc), t = toll(a, b);
    if(t.min > 0.05) bad.push(fmt(a, b, t));
  }
  assert.deepEqual(bad, []);
});

test('témoins : trajets qui doivent être facturés, au bon barème', () => {
  const cases = [
    ['Luxembourg → Genève (transit France)', Pt('Luxembourg', 49.61, 6.13, 'LU'), Pt('Genève', 46.2044, 6.1432, 'CH'), 'FR'],
    ['Lyon → Marseille', Pt('Lyon', 45.76, 4.83, 'FR'), Pt('Marseille', 43.30, 5.37, 'FR'), 'FR'],
    ['Paris → Lille', Pt('Paris', 48.86, 2.35, 'FR'), Pt('Lille', 50.63, 3.06, 'FR'), 'FR'],
    ['Genève → Lyon', Pt('Genève', 46.2044, 6.1432, 'CH'), Pt('Lyon', 45.76, 4.83, 'FR'), 'FR'],
    ['Milan → Bologne', Pt('Milano', 45.46, 9.19, 'IT'), Pt('Bologna', 44.49, 11.34, 'IT'), 'IT'],
    ['Bilbao → Saragosse (AP-68)', Pt('Bilbao', 43.263, -2.935, 'ES'), Pt('Zaragoza', 41.6488, -0.8891, 'ES'), 'ES'],
    ['Lisbonne → Porto', Pt('Lisboa', 38.72, -9.14, 'PT'), Pt('Porto', 41.15, -8.61, 'PT'), 'PT'],
    ['Zagreb → Split', Pt('Zagreb', 45.815, 15.9819, 'HR'), Pt('Split', 43.5081, 16.4402, 'HR'), 'HR'],
    ['Tokyo → Nagoya', Pt('Tokyo', 35.68, 139.69, 'JP'), Pt('Nagoya', 35.18, 136.91, 'JP'), 'JP'],
    ['Istanbul → Izmir', Pt('Istanbul', 41.01, 28.98, 'TR'), Pt('Izmir', 38.42, 27.14, 'TR'), 'TR'],
    ['Casablanca → Marrakech', Pt('Casablanca', 33.57, -7.59, 'MA'), Pt('Marrakech', 31.63, -8.01, 'MA'), 'MA'],
  ];
  const bad = [];
  for(const [name, a, b, cc] of cases){
    const t = toll(a, b);
    if(!(t.amount > 0) || !t.countries.includes(cc)) bad.push(name + ' : ' + t.min + ' à ' + t.amount + ' € [' + t.countries.join('+') + '], attendu > 0 € au barème ' + cc);
  }
  assert.deepEqual(bad, []);
});

test('témoins : grands corridors payants, borne basse > 0 €', () => {
  const cases = [
    ['Lyon → Marseille', Pt('Lyon', 45.76, 4.83, 'FR'), Pt('Marseille', 43.30, 5.37, 'FR')],
    ['Paris → Lille', Pt('Paris', 48.86, 2.35, 'FR'), Pt('Lille', 50.63, 3.06, 'FR')],
    ['Milan → Bologne', Pt('Milano', 45.46, 9.19, 'IT'), Pt('Bologna', 44.49, 11.34, 'IT')],
    ['Lisbonne → Porto', Pt('Lisboa', 38.72, -9.14, 'PT'), Pt('Porto', 41.15, -8.61, 'PT')],
    // Pas Tokyo → Nagoya : le trait coupe par les Alpes japonaises, loin de la Tōmei côtière, et 16 de ses 30 cases sont
    // ambiguës (déviations gratuites de la nationale 1) — borne basse 0 €, limite documentée (README, 11e audit).
    ['Istanbul → Edirne', Pt('Istanbul', 41.0082, 28.9784, 'TR'), Pt('Edirne', 41.6771, 26.5557, 'TR')],
  ];
  const bad = [];
  for(const [name, a, b] of cases){ const t = toll(a, b); if(!(t.min > 0)) bad.push(name + ' : ' + t.min + ' à ' + t.amount + ' €'); }
  assert.deepEqual(bad, []);
});

test('témoins : trajets qui ne doivent pas être facturés', () => {
  const cases = [
    ['Genève → Lausanne', Pt('Genève', 46.2044, 6.1432, 'CH'), Pt('Lausanne', 46.52, 6.63, 'CH')],
    ['Lausanne → Genève', Pt('Lausanne', 46.52, 6.63, 'CH'), Pt('Genève', 46.2044, 6.1432, 'CH')],
    ['Genève → Bâle', Pt('Genève', 46.2044, 6.1432, 'CH'), Pt('Basel', 47.5596, 7.5886, 'CH')],
    ['Genève → Zurich', Pt('Genève', 46.2044, 6.1432, 'CH'), Pt('Zürich', 47.3769, 8.5417, 'CH')],
    ['Vienne → Budapest', Pt('Wien', 48.2082, 16.3738, 'AT'), Pt('Budapest', 47.4979, 19.0402, 'HU')],
    ['Salzbourg → Innsbruck', Pt('Salzburg', 47.8095, 13.055, 'AT'), Pt('Innsbruck', 47.2692, 11.4041, 'AT')],
    ['Munich → Stuttgart', Pt('München', 48.1351, 11.582, 'DE'), Pt('Stuttgart', 48.7758, 9.1829, 'DE')],
    ['Bruxelles → Liège', Pt('Bruxelles', 50.85, 4.35, 'BE'), Pt('Liège', 50.63, 5.57, 'BE')],
  ];
  const bad = [];
  for(const [name, a, b] of cases){ const t = toll(a, b); if(t.amount > 0.05) bad.push(name + ' : ' + t.amount + ' € [' + t.countries.join('+') + ']'); }
  assert.deepEqual(bad, []);
});

test('péage jamais facturé à vélo, et pas quand le péage est décoché', () => {
  const a = Pt('Lyon', 45.76, 4.83, 'FR'), b = Pt('Marseille', 43.30, 5.37, 'FR');
  const km = Math.round(H.hav(a.lat, a.lon, b.lat, b.lon) * 1.287);
  const velo = I.finalizeLeg(km, 18, 'velo', true, 'FR', a, b);
  assert.ok(!velo.tollInfo || !(velo.tollInfo.amount > 0), 'péage à vélo');
  const off = I.finalizeLeg(km, 90, 'voiture-thermique', false, 'FR', a, b);
  assert.ok(!off.tollInfo || off.tollInfo.enabled === false, 'tollInfo.enabled doit refléter la case décochée');
});
