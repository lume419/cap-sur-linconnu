// Invariants du moteur de tirage (lib/trip-engine.js) sur des tirages reproductibles (Math.random à graine).
//   TEST_TRIPS  nombre de tirages aléatoires (300 par défaut, 3000 avec TEST_FULL=1)
//   TEST_SEED   graine de la campagne (1 par défaut) — même graine = mêmes départs et paramètres
// Chaque famille d'invariants est un test distinct ; en cas d'échec, le message donne la graine et les paramètres
// pour rejouer le tirage (withSeed(graine, () => generateTrip(paramètres))). Détail complet : fichier JSONL dans le
// dossier temporaire indiqué en tête de la sortie.
'use strict';
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const H = require('./helpers/engine.js');
const { FULL, num, outFile, summarize } = require('./helpers/config.js');

const TRIPS = num('TEST_TRIPS', FULL ? 3000 : 300);
const SEED = num('TEST_SEED', 1);
const TARGET_SEEDS = FULL ? 12 : 4; // tirages par cas ciblé
const AN = new Date().getFullYear(); // voir les dates tirées plus bas : elles suivent le calendrier

// Départs particuliers : îles, enclaves et exclaves, micro-États, zones à tension, antiméridien, grand Nord, outre-mer.
const SPECIAL = [
  ['Lyon', 'FR'], ['Bastia', 'FR'], ['Ajaccio', 'FR'], ['Dzaoudzi', 'FR'], ['Mamoudzou', 'FR'], ['Saint-Pierre', 'FR'], ['Cayenne', 'FR'], ['Calais', 'FR'],
  ['Strasbourg', 'FR'], ['Chamonix-Mont-Blanc', 'FR'], ['Nice', 'FR'], ['Brest', 'FR'], ['Paris', 'FR'],
  ['Llívia', 'ES'], ['Ceuta', 'ES'], ['Melilla', 'ES'], ['Algeciras', 'ES'], ['Palma', 'ES'], ['Las Palmas de Gran Canaria', 'ES'], ['Madrid', 'ES'],
  ['Lerwick', 'GB'], ['Kirkwall', 'GB'], ['Belfast', 'GB'], ['Dover', 'GB'], ['London', 'GB'],
  ['Tórshavn', 'FO'], ['Reykjavík', 'IS'], ['Nuuk', 'GL'], ['Longyearbyen', 'SJ'], ['Hammerfest', 'NO'], ['Kirkenes', 'NO'],
  ['Kaliningrad', 'RU'], ['Anadyr', 'RU'], ['Petropavlovsk-Kamchatsky', 'RU'], ['Yuzhno-Sakhalinsk', 'RU'], ['Moscow', 'RU'], ['Vladivostok', 'RU'], ['Norilsk', 'RU'], ['Pevek', 'RU'],
  ['Suva', 'FJ'], ['Labasa', 'FJ'], ['Somosomo', 'FJ'], ['Nuku‘alofa', 'TO'], ['Apia', 'WS'], ['Funafuti', 'TV'], ['Tarawa', 'KI'],
  ['Honolulu', 'US'], ['Adak', 'US'], ['Anchorage', 'US'], ['Point Roberts', 'US'], ['Key West', 'US'], ['New York City', 'US'], ['Utqiagvik', 'US'],
  ['Inuvik', 'CA'], ['Iqaluit', 'CA'], ['Ushuaia', 'AR'], ['Punta Arenas', 'CL'], ['Jamestown', 'SH'], ['Edinburgh of the Seven Seas', 'SH'],
  ['Bakı', 'AZ'], ['Cabinda', 'AO'], ['Khasab', 'OM'], ['Pante Makasar', 'TL'], ['Büsingen', 'DE'], ['Campione', 'IT'], ['Genève', 'CH'], ['Lausanne', 'CH'], ['Ljubljana', 'SI'],
  ['Victoria', 'MT'], ['Valletta', 'MT'], ['Nicosia', 'CY'], ['Lemesos', 'CY'], ['Irákleion', 'GR'], ['Póros', 'GR'], ['Thessaloniki', 'GR'],
  ['Turku', 'FI'], ['Vaasa', 'FI'], ['Helsinki', 'FI'], ['Umeå', 'SE'], ['Stockholm', 'SE'], ['Tallinn', 'EE'], ['Rønne', 'DK'], ['Split', 'HR'], ['Dubrovnik', 'HR'], ['Neum', 'BA'],
  ['Gaza', 'PS'], ['Rafah', 'PS'], ['Tel Aviv-Yafo', 'IL'], ['Beyrouth', 'LB'], ['Damashq', 'SY'], ['Kyiv', 'UA'], ['Aden', 'YE'], ['Maiduguri', 'NG'], ['Acapulco', 'MX'], ['Mogadishu', 'SO'],
  ['Kinshasa', 'CD'], ['Brazzaville', 'CG'], ['Leticia', 'CO'], ['Manaus', 'BR'], ['Jincheng', 'TW'], ['Magong', 'TW'], ['Taipei', 'TW'], ['Jeju City', 'KR'], ['Seoul', 'KR'],
  ['Naha', 'JP'], ['Sapporo', 'JP'], ['Tokyo', 'JP'], ['Okushiri', 'JP'],
  ['Hong Kong', 'HK'], ['Macau', 'MO'], ['Singapore', 'SG'], ['Batam', 'ID'], ['Jayapura', 'ID'], ['Vanimo', 'PG'], ['Bangkok', 'TH'], ['Hanoi', 'VN'],
  ['Manama', 'BH'], ['Doha', 'QA'], ['Dubai', 'AE'], ['Port Blair', 'IN'], ['Malé', 'MV'], ['Colombo', 'LK'], ['Manila', 'PH'], ['Lahore', 'PK'],
  ['Invercargill', 'NZ'], ['Hobart', 'AU'], ['Darwin', 'AU'], ['Port-aux-Français', 'TF'], ['Adamstown', 'PN'], ['Alofi', 'NU'], ['Avarua', 'CK'],
  ['Istanbul', 'TR'], ['Casablanca', 'MA'], ['Tunis', 'TN'], ['Dakar', 'SN'], ['Lisboa', 'PT'], ['Porto', 'PT'], ['Roma', 'IT'], ['Cagliari', 'IT'], ['Palermo', 'IT'], ['Beograd', 'RS'], ['Skopje', 'MK'],
  ['Luxembourg', 'LU'], ['Basel', 'CH'], ['Vaduz', 'LI'], ['Monaco', 'MC'], ['San Marino', 'SM'], ['Andorra la Vella', 'AD'], ['Città del Vaticano', 'VA'], ['Berlin', 'DE'], ['Warszawa', 'PL'],
  ['Kabul', 'AF'], ['Tehran', 'IR'], ['Al Qahirah', 'EG'], ['Nairobi', 'KE'], ['Zanzibar', 'TZ'], ['Antananarivo', 'MG'], ['Port Louis', 'MU'], ['Praia', 'CV'], ['Mindelo', 'CV'],
  ['Lima', 'PE'], ['La Paz', 'BO'], ['Havana', 'CU'], ['Kingston', 'JM'], ['Mexico City', 'MX']
];

// Familles d'invariants : un test par famille (les noms non listés vont dans « autres »).
const FAMILIES = [
  ['état global remis à zéro après chaque tirage', ['etat']],
  ['aucune exception inattendue', ['exception']],
  ['pas de NaN / undefined / valeur négative', ['valeurs', 'maxLegKmRenvoye']],
  ['nombre de journées et structure', ['jours']],
  ['retour au point de départ', ['retour']],
  ['nuits par ville (minimum, maximum ou avis days.overMaxPerCity), 15 villes au plus', ['nuitsParVille', 'nbVilles']],
  ['pas de ville en double ni de départ tiré comme étape', ['doublons']],
  ['éloignement minimal, distance maximale et rayon de retour', ['eloignementMin', 'eloignementMax', 'rayonRetour', 'diagMinDistanceUnreachable']],
  ['maxLegKm respecté ou dépassement signalé et justifié (overMaxLeg)', ['maxLeg']],
  ['pas de route à travers la mer ni de frontière inexistante', ['mer', 'frontiere']],
  ['ferry seulement si ferryEnabled, sur une liaison existante', ['ferry', 'ferryRoadKm']],
  ['zones à tension évitées quand le filtre est actif', ['tension']],
  ['péage seulement dans les pays à barème, montant cohérent', ['peage']],
];
const KNOWN = new Set(FAMILIES.flatMap(f => f[1]));

let E, A;
let campaign = null; // { violations: [], trips, empties, emptyKinds, applied }

before(async () => {
  E = await H.load();
  A = E.__test;
});

// Un nom absent des données ne fait échouer AUCUN test : findPlace rend null, le départ est simplement sauté et la
// campagne tire ailleurs. Trois entrées étaient ainsi inertes depuis la 10e passe — « Heraklion » (publié
// « Irákleion »), « Tel Aviv » (« Tel Aviv-Yafo ») et « Rome » (« Roma ») : les trois villes qu'on avait justement
// mises dans cette liste pour leurs particularités (île grecque, zone à tension, capitale) n'étaient jamais tirées.
// Corrigées au 20e audit du 21/09/2026, et le test ci-dessous interdit que cela recommence en silence.
function specialDepartures(){
  const out = [];
  for(const [n, cc] of SPECIAL){ const c = H.findPlace(n, cc); if(c) out.push(c); }
  return out;
}

test('départs particuliers : chaque nom de la liste existe bien dans les données publiées', () => {
  const absents = SPECIAL.filter(([n, cc]) => !H.findPlace(n, cc)).map(([n, cc]) => cc + ' ' + JSON.stringify(n));
  assert.deepEqual(absents, [], 'départ particulier introuvable : la campagne le saute sans rien dire');
  assert.equal(specialDepartures().length, SPECIAL.length);
});

function runCampaign(){
  const C = A.COMMUNES;
  const byCountry = H.byCountry();
  const countries = [...byCountry.keys()].sort();
  const special = specialDepartures();
  const extreme = C.filter(c => c.country === 'AQ' || c.lat > 75 || c.lat < -60 || Math.abs(c.lon) > 179.5);
  const R = H.mulberry32(SEED * 7919 + 13);
  const pick = a => a[Math.floor(R() * a.length)];
  const randomDep = () => {
    const r = R();
    if(r < 0.35) return pick(special);
    if(r < 0.42 && extreme.length) return pick(extreme);
    if(r < 0.7) return pick(byCountry.get(pick(countries)));
    return C[Math.floor(R() * C.length)];
  };
  const randomParams = d => {
    const p = { departureCity: H.depObj(d) };
    p.days = pick([1, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 17, 21, 21]);
    p.budgetKey = pick(['economique', 'moyen', 'confortable', 'moyen', 'luxe']);
    p.transportKey = pick(['voiture-thermique', 'voiture-hybride', 'voiture-electrique', 'voiture-electrique', 'van', 'moto', 'moto', 'velo', 'velo']);
    p.tollEnabled = R() < 0.7; p.ferryEnabled = R() < 0.75; p.avoidTent = R() < 0.3;
    const at = R(); p.avoidTension = at < 0.6 ? true : at < 0.85 ? false : undefined;
    // Années RELATIVES à l'année en cours (18e audit du 21/09/2026) : elles étaient écrites en dur (2026, 2027,
    // 2031). parseIsoDate n'accepte que l'année précédente à trois ans plus tard — en 2028, « 2026-.. » serait
    // devenu invalide et 60 % de la campagne serait silencieusement repartie à la date du jour, sans que rien
    // n'échoue. AN + 5 reste hors fenêtre quelle que soit l'année, AN-02-31 reste une date inexistante.
    const ts = R(); p.tripStart = ts < 0.6 ? AN + '-' + String(1 + Math.floor(R() * 12)).padStart(2, '0') + '-' + String(1 + Math.floor(R() * 28)).padStart(2, '0') : ts < 0.7 ? AN + '-02-31' : ts < 0.8 ? (AN + 5) + '-05-01' : ts < 0.9 ? (AN + 1) + '-12-31' : undefined;
    p.maxRadiusKm = pick([undefined, 20, 50, 100, 150, 300, 300, 500, 800, 1500, 3000]);
    p.minDistanceKm = R() < 0.5 ? 0 : pick([15, 30, 60, 100, 150, 250, 400, 600, 1000, 2000, 3000]);
    p.maxDistanceKm = R() < 0.5 ? 0 : pick([30, 60, 100, 150, 250, 400, 600, 1000, 2000, 3000]);
    if(p.minDistanceKm > 0 && p.maxDistanceKm > 0 && p.minDistanceKm > p.maxDistanceKm && R() < 0.85) p.maxDistanceKm = p.minDistanceKm + pick([0, 50, 300]);
    p.maxLegKm = R() < 0.3 ? undefined : pick([5, 20, 40, 60, 80, 100, 150, 200, 300, 400, 600, 1000, 3000]);
    p.minDaysPerCity = pick([undefined, 1, 1, 1, 2, 3, 5, 20]);
    p.maxDaysPerCity = pick([undefined, 1, 2, 3, 3, 4, 6, 20]);
    if(R() < 0.05) p.avoidNorm = d.name;
    p.preferredCurrency = R() < 0.6 ? undefined : pick(['EUR', 'USD', 'JPY', 'XYZ', 'eur', 'GBP', 'CHF']);
    return p;
  };

  const res = { violations: [], trips: 0, empties: 0, emptyKinds: {}, applied: {}, times: [] };
  for(let k = 0; k < TRIPS; k++){
    const d = randomDep();
    const params = randomParams(d);
    const seed = SEED * 1000003 + k;
    const where = d.name + '/' + d.country;
    let r, err = null;
    const t0 = Date.now();
    try { r = H.withSeed(seed, () => E.generateTrip(params)); } catch(e){ err = e; }
    const ms = Date.now() - t0;
    res.trips++;
    if(err){
      const expected = params.minDistanceKm > 0 && params.maxDistanceKm > 0 && params.minDistanceKm > params.maxDistanceKm && err.constructor === Error;
      if(!expected) res.violations.push({ inv: 'exception', msg: err.constructor.name + ' : ' + err.message, seed, dep: where, params });
      if(!H.stateIsReset()) res.violations.push({ inv: 'etat', msg: 'état non remis à zéro après une exception', seed, dep: where, params });
      continue;
    }
    res.times.push(ms);
    const c = H.check(params, r, ms);
    for(const key in c.applied) res.applied[key] = (res.applied[key] || 0) + c.applied[key];
    if(c.empty){
      res.empties++;
      const kind = r.timedOut ? 'timedOut' : r.minDistanceNotFound ? 'minDistanceNotFound' : r.minDistanceUnreachable ? 'minDistanceUnreachable' : r.tensionBlocked ? 'tensionBlocked' : 'vide';
      res.emptyKinds[kind] = (res.emptyKinds[kind] || 0) + 1;
    }
    for(const x of c.v) res.violations.push(Object.assign({ seed, ms, dep: where, params }, x));
    // CONTRE-ÉPREUVE (15e audit du 19/09/2026) : un aller-retour « hors de portée, X km » est rejoué à X km, même graine.
    // X doit être faisable (itinéraire trouvé, ou seulement bloqué par les zones à tension). Au 14e audit, X venait d'un
    // filtre optimiste : redemander à X renvoyait « hors de portée, X − 1 » (jusqu'à 109 fois de suite).
    if(params.days <= 1 && r.minDistanceUnreachable && r.returnCapKm > 0){
      const again = Object.assign({}, params, { minDistanceKm: r.returnCapKm });
      let r2 = null;
      try { r2 = H.withSeed(seed, () => E.generateTrip(again)); } catch(e){ r2 = { error: e.message }; }
      res.replays = (res.replays || 0) + 1;
      // Et X doit être le MAXIMUM : au-delà (X + 5 km, sous l'éloignement demandé), plus aucun itinéraire. Le balayage
      // est exhaustif depuis le 17e audit ; au 15e, 24 lieux seulement étaient contrôlés (Leganes annonçait 161 km pour
      // 199 faisables) et au 16e le balayage par tranches laissait jusqu'à 71 km d'écart.
      // Exigé SEULEMENT quand le moteur affirme avoir conclu (returnCapExact, 17e audit du 20/09/2026). Quand le budget
      // de temps tombe au milieu du balayage, le moteur le dit et n'annonce plus qu'un minorant : Tallinn en van
      // (graine 1002629) rendait 276 km pour 299 faisables, et exiger le maximum ferait alors échouer la campagne sur
      // la CHARGE de la machine, pas sur un défaut. Ces cas sont comptés (capsApprox) pour rester visibles : s'ils
      // devenaient nombreux, c'est le budget qu'il faudrait revoir.
      const up = r.returnCapKm + 5; // balayage exhaustif depuis le 17e audit : X est le maximum, à l'arrondi près
      if(r.returnCapExact === false) res.capsApprox = (res.capsApprox || 0) + 1;
      if(up < params.minDistanceKm && r.returnCapExact !== false){
        let r3 = null;
        try { r3 = H.withSeed(seed, () => E.generateTrip(Object.assign({}, params, { minDistanceKm: up }))); } catch(e){ r3 = null; }
        if(r3 && r3.legs && r3.legs.length){
          res.violations.push({ inv: 'contreEpreuve', sev: 'moyenne', seed, dep: where, params,
            msg: 'hors de portée, ' + r.returnCapKm + ' km annoncés, mais ' + up + ' km donne un itinéraire (' + Math.round(r3.legs[0].distanceKm) + ' km)' });
        }
      }
      if(!r2 || r2.error || !(r2.legs && r2.legs.length || r2.tensionBlocked || r2.timedOut)){
        res.violations.push({ inv: 'contreEpreuve', sev: 'haute', seed, dep: where, params,
          msg: 'hors de portée, ' + r.returnCapKm + ' km annoncés, mais ' + r.returnCapKm + ' km redemandés : ' + JSON.stringify(r2 && Object.keys(r2).filter(k => k !== 'legs' && k !== 'spinPool')) + (r2 && r2.returnCapKm ? ' ' + r2.returnCapKm : '') });
      }
    }
  }
  return res;
}

test('campagne de tirages aléatoires à graine (' + TRIPS + ' tirages, graine ' + SEED + ')', { timeout: TRIPS * 20000 }, t => {
  const t0 = Date.now();
  campaign = runCampaign();
  const file = outFile('engine-violations-seed' + SEED + '.jsonl');
  fs.writeFileSync(file, campaign.violations.map(x => JSON.stringify(x)).join('\n'));
  const ts = campaign.times.slice().sort((a, b) => a - b);
  t.diagnostic(campaign.trips + ' tirages en ' + Math.round((Date.now() - t0) / 1000) + ' s ; vides ' + campaign.empties + ' ' + JSON.stringify(campaign.emptyKinds) +
    ' ; médiane ' + ts[ts.length >> 1] + ' ms, max ' + ts[ts.length - 1] + ' ms ; contre-épreuves ' + (campaign.replays || 0) + (campaign.capsApprox ? ' (dont ' + campaign.capsApprox + ' plafond(s) approché(s), budget de temps épuisé)' : '') + ' ; ' + campaign.violations.length + ' violation(s) -> ' + file);
  // La campagne doit produire des itinéraires (un moteur qui renverrait toujours des étapes vides passerait tout le reste).
  // SEUIL RESSERRÉ (24/09/2026). Il tolérait 60 % de tirages vides pour un taux réel de 35,5 % (1 064 sur 3 000,
  // dont 368 « éloignement introuvable », 262 « éloignement hors de portée », 210 zones à tension, 182 vides et
  // 42 expirés) : une régression doublant les tirages vides serait passée au vert. Il tolère désormais 45 %, soit
  // dix écarts-types au-dessus du taux mesuré — assez large pour la variation d une campagne à l autre, assez
  // serré pour voir une vraie dérive.
  assert.ok(campaign.trips - campaign.empties >= campaign.trips * 0.55, 'trop de tirages vides : ' + campaign.empties + '/' + campaign.trips);
});

for(const [title, invs] of FAMILIES){
  test('invariant : ' + title, () => {
    assert.ok(campaign, 'campagne non exécutée');
    const list = campaign.violations.filter(x => invs.includes(x.inv));
    assert.equal(list.length, 0, summarize(list));
  });
}
test('invariant : autres contrôles (dates, durées, distances, recharge, restrictions, avis, diagnostics)', () => {
  assert.ok(campaign, 'campagne non exécutée');
  const list = campaign.violations.filter(x => !KNOWN.has(x.inv));
  assert.equal(list.length, 0, summarize(list));
});

// ------------------------------------------------------------------------------------------ vérificateur lui-même
const base = (d, extra) => Object.assign({ departureCity: d, days: 7, budgetKey: 'moyen', transportKey: 'voiture-thermique', tollEnabled: true, ferryEnabled: true,
  avoidTent: false, avoidTension: true, tripStart: AN + '-10-01' }, extra || {});
const run = (p, seed) => H.withSeed(seed, () => E.generateTrip(p));

test('le vérificateur détecte des défauts injectés, et dans la BONNE famille', t => {
  // 19e audit du 21/09/2026. La version précédente injectait neuf défauts et se contentait de « au moins une
  // violation » : deux de ses étiquettes désignaient une famille qui n'était pas celle qui réagissait, et la plupart
  // des familles n'étaient jamais éprouvées — dont « mer », « frontiere », « recharge » et « doublons », c'est-à-dire
  // des contrôles de sécurité. Chaque injection déclare maintenant la ou les familles qu'elle DOIT faire lever, et le
  // test vérifie en plus que l'ensemble des familles visées est bien couvert.
  // 20e audit du 21/09/2026 : le compte annoncé par la 19e passe était FAUX. Le vérificateur ne lève pas 28 familles
  // mais 32 (relevées sur les appels bad() de tests/helpers/engine.js et sur les violations poussées ici même), et la
  // 19e passe n'en éprouvait que 14. Neuf injections de plus sont ajoutées — spinPool, maxLegKmRenvoye, nbVilles,
  // eloignementMin, durees, notices, restrictions, diagMinDistanceUnreachable, journeeSurPlace — ce qui porte la
  // couverture à 23 familles sur 32. Les neuf restantes et la raison de leur absence sont listées dans NON_COUVERTES
  // ci-dessous, et ce partage est lui-même vérifié : une famille qui disparaît ou qui apparaît fait échouer le test.
  const p0 = base(H.dep('Lyon', 'FR'), { transportKey: 'voiture-electrique', days: 8, maxLegKm: 300, minDistanceKm: 200 });
  const r0 = run(p0, 42);
  assert.ok(r0.legs.length > 0, 'tirage de référence vide');
  assert.deepEqual(H.check(p0, r0, 0).v, [], 'le tirage de référence doit être sans violation');
  // [nom, injection, familles attendues]
  const muts = [
    // Une étape qui VOYAGE : allonger la distance d'une journée sur place lève « journeeSurPlace », pas « distance ».
    ['distance allongée', r => { const l = r.legs.find((x, i) => i > 0 && x.distanceKm > 0 && !x.isReturn); l.distanceKm += 100; }, ['distance']],
    ['retour ailleurs', r => { r.legs[r.legs.length - 1].lat += 1; }, ['retour']],
    ['ferry inventé', r => { r.legs[0].ferryInfo = { routeKey: 'x', amount: 1, durationH: 1 }; }, ['ferry']],
    ['péage dans un pays sans barème', r => { r.legs[0].tollInfo = { enabled: true, amount: 5, countries: ['CH'], tolledKm: 50, rate: 0.1 }; }, ['peage']],
    ['durée NaN', r => { r.legs[0].travelMin = NaN; }, ['valeurs']],
    ['date d\'arrivée dans le passé', r => { r.legs[1].checkIn = '2020-01-01'; }, ['dates']],
    ['tension inventée', r => { r.legs[0].tension = { level: 'red' }; }, ['tension']],
    ['étape au-delà du plafond', r => { const l = r.legs.find((x, i) => i > 0 && !x.isReturn && x.norm !== r.legs[i - 1].norm); if(l) l.distanceKm = 900; }, ['maxLeg']],
    ['étape en plein océan', r => { r.legs[1].lat = 40; r.legs[1].lon = -40; }, ['mer']],
    ['étape sautée au Japon', r => { r.legs[1].lat = 35.68; r.legs[1].lon = 139.76; r.legs[1].country = 'JP'; }, ['frontiere', 'mer']],
    ['recharges effacées', r => { r.legs.forEach(l => { if(l.chargeInfo) l.chargeInfo = null; }); }, ['recharge']],
    ['recharges inventées', r => { const l = r.legs.find(x => x.distanceKm > 100); if(l) l.chargeInfo = { stops: 9, minutes: 999 }; }, ['recharge']],
    ['étape en double', r => { r.legs.push(JSON.parse(JSON.stringify(r.legs[1]))); }, ['doublons', 'nuitsParVille', 'jours']],
    // 20e audit : neuf familles de plus, chacune vérifiée par une injection qui la vise.
    ['roulette gonflée', r => { r.spinPool = new Array(60).fill('x'); }, ['spinPool']],
    ['maxLegKm renvoyé négatif', r => { r.maxLegKm = -3; }, ['maxLegKmRenvoye']],
    ['vingt-cinq villes de plus', r => { for(let i = 0; i < 25; i++){ const l = JSON.parse(JSON.stringify(r.legs[1])); l.name = 'Ville' + i; l.norm = 'ville' + i; l.lat += (i + 1) * 0.01; r.legs.splice(1, 0, l); } }, ['nbVilles']],
    ['tout ramené au point de départ', r => { const f = r.legs[r.legs.length - 1]; r.legs.forEach(l => { l.lat = f.lat; l.lon = f.lon; }); }, ['eloignementMin']],
    ['durée de trajet absurde', r => { const l = r.legs.find(x => x.distanceKm > 100); if(l) l.travelMin = 2; }, ['durees']],
    ['avis et journées effacés', r => { r.notices = []; r.days = null; }, ['notices']],
    ['restriction inventée', r => { r.legs[0].restrictions = [{ kind: 'inventé' }]; }, ['restrictions']],
    ['diagnostic « hors de portée » sur un voyage trouvé', r => { r.minDistanceUnreachable = true; r.returnCapKm = 10; }, ['diagMinDistanceUnreachable']]
  ];
  // Une journée SUR PLACE (aucun trajet) n'existe pas dans le tirage de référence ci-dessus : il en faut un second,
  // avec deux nuits par ville, pour éprouver la famille « journeeSurPlace ».
  const p1 = base(H.dep('Lyon', 'FR'), { days: 10, minDaysPerCity: 2, maxDistanceKm: 400, maxRadiusKm: 500 });
  const r1 = run(p1, 7);
  assert.ok(r1.legs && r1.legs.length > 2, 'second tirage de référence vide');
  assert.deepEqual(H.check(p1, r1, 0).v, [], 'le second tirage de référence doit être sans violation');
  assert.ok(r1.legs.some((x, i) => i > 0 && x.distanceKm === null), 'aucune journée sur place dans le second tirage de référence');
  const manqués = [], mauvaiseFamille = [], vues = new Set();
  for(const [nom, f, attendues] of muts){
    const r = JSON.parse(JSON.stringify(r0)); f(r);
    const v = H.check(p0, r, 0).v;
    const familles = new Set(v.map(x => x.inv));
    familles.forEach(x => vues.add(x));
    if(!v.length){ manqués.push(nom); continue; }
    const absentes = attendues.filter(x => !familles.has(x));
    if(absentes.length) mauvaiseFamille.push(nom + ' : attendu ' + absentes.join('+') + ', obtenu ' + [...familles].join('+'));
  }
  assert.deepEqual(manqués, [], 'défauts non détectés');
  assert.deepEqual(mauvaiseFamille, [], 'défaut détecté, mais pas par le contrôle censé le voir');
  // Couverture : les familles que ce test s'engage à éprouver. Les autres restent non couvertes, et c'est écrit
  // plutôt que sous-entendu — voir le rapport de la 19e passe.
  // Journée sur place à laquelle on fait traverser un bras de mer : c'est le second tirage qui sert.
  {
    const r = JSON.parse(JSON.stringify(r1));
    const surPlace = r.legs.findIndex((x, i) => i > 0 && x.distanceKm === null);
    r.legs[surPlace].ferryInfo = { routeKey: 'FR-Bastia|FR-Nice', amount: 50, durationH: 6, roadKm: 9999 };
    const v = H.check(p1, r, 0).v;
    v.forEach(x => vues.add(x.inv));
    if(!v.some(x => x.inv === 'journeeSurPlace')) mauvaiseFamille.push('ferry un jour sans trajet : attendu journeeSurPlace, obtenu ' + [...new Set(v.map(x => x.inv))].join('+'));
  }
  const VISEES = ['distance', 'retour', 'ferry', 'peage', 'valeurs', 'dates', 'tension', 'maxLeg', 'mer', 'frontiere',
    'recharge', 'doublons', 'nuitsParVille', 'jours',
    'spinPool', 'maxLegKmRenvoye', 'nbVilles', 'eloignementMin', 'durees', 'notices', 'restrictions',
    'diagMinDistanceUnreachable', 'journeeSurPlace'];
  assert.deepEqual(VISEES.filter(x => !vues.has(x)), [], 'famille visée jamais levée par aucune injection');
  // Ce que ce test N'ÉPROUVE PAS, écrit plutôt que sous-entendu, avec la raison. Trois de ces familles ne sont pas
  // injectables du tout : elles ne décrivent pas un résultat de tirage mais la CAMPAGNE elle-même (une exception
  // levée, un état global resté sale, une contre-épreuve « hors de portée » rejouée). Les six autres demandent des
  // paramètres ou une géométrie que ces deux tirages de référence n'ont pas.
  const NON_COUVERTES = {
    exception: 'la campagne seule peut la lever (le tirage lève une exception)',
    etat: 'la campagne seule peut la lever (état global non remis à zéro)',
    contreEpreuve: 'la campagne seule peut la lever (« hors de portée, X km » rejoué à X km)',
    eloignementMax: 'aucune injection trouvée qui la lève SANS lever d\'abord « mer » ou « distance »',
    rayonRetour: 'idem : déplacer l\'avant-dernière étape lève « mer » avant le rayon',
    reposPremierTrajet: 'idem : allonger le premier trajet lève « distance », « maxLeg » et « durees » avant',
    ferryRoadKm: 'idem : un ferry incohérent lève « ferry » ou « journeeSurPlace » avant',
    diagDayTrip: 'diagnostic d\'un aller-retour d\'un jour : ne se pose pas sur un tirage de sept jours',
    diagnostics: 'cohérence d\'ensemble des diagnostics : levée par la campagne, pas par une mutation isolée'
  };
  // Le partage lui-même est vérifié : une famille qui apparaît dans le vérificateur sans être ni visée ni
  // explicitement laissée de côté fait échouer ce test, pour qu'on la traite au lieu de l'ignorer.
  const émises = new Set();
  const srcCheck = fs.readFileSync(path.join(__dirname, 'helpers', 'engine.js'), 'utf8');
  for(const m of srcCheck.matchAll(/bad\(\s*'([^']+)'/g)) émises.add(m[1]);
  for(const m of fs.readFileSync(__filename, 'utf8').matchAll(/inv:\s*'([^']+)'/g)) émises.add(m[1]);
  const orphelines = [...émises].filter(x => VISEES.indexOf(x) < 0 && !Object.prototype.hasOwnProperty.call(NON_COUVERTES, x)).sort();
  assert.deepEqual(orphelines, [], 'famille du vérificateur ni éprouvée ni déclarée non couverte');
  const inutiles = Object.keys(NON_COUVERTES).filter(x => !émises.has(x) || VISEES.indexOf(x) >= 0).sort();
  assert.deepEqual(inutiles, [], 'famille déclarée non couverte alors qu\'elle n\'existe plus ou qu\'elle est désormais éprouvée');
  t.diagnostic('familles du vérificateur : ' + émises.size + ' ; éprouvées par injection : ' + VISEES.length + ' ; non couvertes : ' + Object.keys(NON_COUVERTES).length);
});

// ------------------------------------------------------------------------------------------ déterminisme et état
test('même graine = même tirage, même après d\'autres tirages et des exceptions', () => {
  const scen = [
    base(H.dep('Lyon', 'FR'), { transportKey: 'voiture-electrique', maxLegKm: 300, days: 10 }),
    base(H.dep('Bastia', 'FR'), { transportKey: 'moto', minDistanceKm: 150, maxLegKm: 100, days: 5 }),
    base(H.dep('Tokyo', 'JP'), { transportKey: 'van', days: 8, maxRadiusKm: 500 }),
    base(H.dep('Helsinki', 'FI'), { transportKey: 'velo', days: 6 }),
  ];
  const perturb = [
    base(H.dep('Nuuk', 'GL'), { days: 21, maxRadiusKm: 3000, avoidTension: false, ferryEnabled: false }),
    base(H.dep('Maiduguri', 'NG'), { avoidTension: true, days: 3 }),
    base(H.dep('Kinshasa', 'CD'), { transportKey: 'voiture-electrique', days: 14, maxLegKm: 5 }),
  ];
  const diffs = [];
  scen.forEach((p, s) => {
    const seed = 500 + s;
    const a = JSON.stringify(run(p, seed));
    try { run(perturb[s % perturb.length], 999 + s); } catch(e){}
    try { E.generateTrip({ departureCity: p.departureCity, days: 0 }); } catch(e){}
    const b = JSON.stringify(run(p, seed));
    if(a !== b) diffs.push(p.departureCity.name);
    assert.ok(H.stateIsReset(), 'état non remis à zéro');
  });
  assert.deepEqual(diffs, [], 'résultats différents pour la même graine');
});

// ------------------------------------------------------------------------------------------ entrées invalides
test('entrées invalides : Error explicite ou valeur ramenée dans les bornes, état toujours remis à zéro', () => {
  const lyon = H.dep('Lyon', 'FR');
  const inputs = [
    ['days 0', { days: 0 }, 'throw'], ['days 22', { days: 22 }, 'throw'], ['days NaN', { days: NaN }, 'throw'], ['days null', { days: null }, 'throw'], ['days []', { days: [] }, 'throw'],
    ['days 1.4', { days: 1.4 }, 1], ['days 21.49', { days: 21.49 }, 21], ['days "3"', { days: '3' }, 3], ['days [5]', { days: [5] }, 'throw'], ['days true', { days: true }, 'throw'],
    ['maxLegKm 1e308', { maxLegKm: 1e308 }, 'ok'], ['maxLegKm -1', { maxLegKm: -1 }, 'ok'], ['maxLegKm "abc"', { maxLegKm: 'abc' }, 'ok'], ['maxLegKm 0.4', { maxLegKm: 0.4 }, 'ok'],
    ['minDistanceKm 1e308', { minDistanceKm: 1e308 }, 'ok'], ['minDistanceKm -50', { minDistanceKm: -50 }, 'ok'], ['min > max', { minDistanceKm: 500, maxDistanceKm: 100 }, 'throw'],
    ['maxRadiusKm 1e9', { maxRadiusKm: 1e9 }, 'ok'], ['maxRadiusKm -3', { maxRadiusKm: -3 }, 'ok'],
    ['minDaysPerCity 1e9', { minDaysPerCity: 1e9 }, 'ok'], ['maxDaysPerCity 0', { maxDaysPerCity: 0 }, 'ok'], ['minDays > maxDays', { minDaysPerCity: 5, maxDaysPerCity: 2 }, 'ok'],
    ['tripStart objet', { tripStart: { toString(){ return '2026-01-01'; } } }, 'ok'], ['tripStart passé', { tripStart: '2020-01-01' }, 'ok'],
    ['devise XYZ', { preferredCurrency: 'XYZ' }, 'ok'], ['devise __proto__', { preferredCurrency: '__proto__' }, 'ok'], ['devise objet', { preferredCurrency: {} }, 'ok'],
    ['transport inconnu', { transportKey: 'avion' }, 'ok'], ['transport __proto__', { transportKey: '__proto__' }, 'ok'], ['budget __proto__', { budgetKey: '__proto__' }, 'ok'],
    ['avoidNorm objet', { avoidNorm: { a: 1 } }, 'ok'], ['avoidNorm géant', { avoidNorm: 'x'.repeat(100000) }, 'ok'],
  ];
  const problems = [];
  for(const [name, extra, exp] of inputs){
    const p = base(lyon, Object.assign({ days: 5 }, extra));
    let r, e;
    try { r = run(p, 77); } catch(err){ e = err; }
    if(!H.stateIsReset()) problems.push(name + ' : état non remis à zéro');
    if(exp === 'throw'){
      if(!e) problems.push(name + ' : accepté (exception attendue)');
      else if(e.constructor !== Error) problems.push(name + ' : ' + e.constructor.name + ' au lieu d\'Error');
      continue;
    }
    if(e){ problems.push(name + ' : exception ' + e.constructor.name + ' ' + e.message); continue; }
    if(typeof exp === 'number' && r.legs.length && r.legs.length !== (exp === 1 ? 2 : exp)) problems.push(name + ' : ' + r.legs.length + ' journées au lieu de ' + exp);
    if(r.legs.length){ const c = H.check(p, r, 0); if(c.v.length) problems.push(name + ' : ' + c.v.slice(0, 3).map(x => x.inv + ' ' + x.msg).join(' ; ')); }
  }
  assert.deepEqual(problems, []);
});

test('départs forgés (pôles, antiméridien, en mer, champs de mauvais type) : jamais d\'erreur de programmation', () => {
  const forged = [
    ['pôle nord', { name: 'X', lat: 90, lon: 0, country: 'FR' }], ['pôle sud', { name: 'X', lat: -90, lon: 180, country: 'AQ' }],
    ['lon -180', { name: 'X', lat: -16.5, lon: -180, country: 'FJ' }], ['lon 180', { name: 'X', lat: -16.5, lon: 180, country: 'FJ' }],
    ['en mer', { name: 'X', lat: 45, lon: -30, country: 'PT' }], ['FR au Japon', { name: 'X', lat: 35.68, lon: 139.7, country: 'FR' }],
    ['pays __proto__', { name: 'X', lat: 45, lon: 4, country: '__proto__' }], ['pays hasOwnProperty', { name: 'X', lat: 45, lon: 4, country: 'hasOwnProperty' }],
    ['allCps objets', { name: 'X', lat: 45, lon: 4, country: 'FR', allCps: [{}, [], null, 5, 'x'.repeat(100)] }], ['dept objet', { name: 'X', lat: 45, lon: 4, country: 'FR', dept: { a: 1 } }],
    ['nom numérique', { name: 12345, lat: 45, lon: 4, country: 'FR' }], ['lat en texte', { name: 'X', lat: '45.7', lon: '4.8', country: 'FR' }],
    ['lat vide', { name: 'X', lat: '', lon: '', country: 'FR' }], ['lat 91', { name: 'X', lat: 91, lon: 0, country: 'FR' }],
  ];
  const problems = [];
  for(const [name, d] of forged){
    let e;
    try { run(base(d, { days: 6 }), 5); } catch(err){ e = err; }
    if(e && e.constructor !== Error) problems.push(name + ' : ' + e.constructor.name + ' ' + e.message);
    if(!H.stateIsReset()) problems.push(name + ' : état non remis à zéro');
  }
  assert.deepEqual(problems, []);
});

// ------------------------------------------------------------------------------------------ cas ciblés
// Chaque cas : TARGET_SEEDS tirages à graine, tous les invariants vérifiés, plus un contrôle propre au cas.
const P = (lat, lon, country, name) => ({ name, cp: '', lat, lon, dept: 'x', country, allCps: [] });
// Ligne de la mer d'Åland (entre la Suède et l'archipel) : une étape routière SE <-> FI ne doit jamais la couper.
const ALAND = [[[60.70, 19.30], [59.95, 19.30]], [[59.95, 19.30], [59.90, 19.65]], [[59.90, 19.65], [59.20, 19.65]]];
function cutsAland(a, b){
  const cr = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const inter = (p1, p2, q1, q2) => (cr(q1, q2, p1) > 0) !== (cr(q1, q2, p2) > 0) && (cr(p1, p2, q1) > 0) !== (cr(p1, p2, q2) > 0);
  return ALAND.some(s => inter([a.lon, a.lat], [b.lon, b.lat], [s[0][1], s[0][0]], [s[1][1], s[1][0]]));
}
function roadLegs(p, r){
  const out = []; let prev = p.departureCity;
  for(const l of r.legs){ const cur = l.isReturn ? p.departureCity : l; if(!l.ferryInfo) out.push([prev, cur, l]); prev = cur; }
  return out;
}
const TARGETED = [
  // mer d'Åland (point 5)
  ['Turku, moto, ferries décochés', () => base(P(60.4518, 22.2666, 'FI', 'Turku'), { transportKey: 'moto', days: 6, ferryEnabled: false, avoidTension: false, maxDistanceKm: 700 }), 'aland'],
  ['Stockholm, voiture, ferries cochés, éloignement 150', () => base(P(59.3293, 18.0686, 'SE', 'Stockholm'), { days: 6, minDistanceKm: 150, maxDistanceKm: 700 }), 'aland'],
  ['Norrtälje, voiture, ferries décochés', () => base(P(59.758, 18.705, 'SE', 'Norrtälje'), { days: 6, ferryEnabled: false, maxDistanceKm: 700 }), 'aland'],
  // overMaxLeg (point 6) : maxLegKm proche ou au-dessous de l'éloignement
  ['Lyon 150/110 (max entre 1,287 et 1,4 × min)', () => base(H.dep('Lyon', 'FR'), { days: 5, maxLegKm: 150, minDistanceKm: 110, avoidTension: false })],
  ['Bordeaux vélo 80/60', () => base(H.dep('Bordeaux', 'FR'), { transportKey: 'velo', days: 6, maxLegKm: 80, minDistanceKm: 60 })],
  ['Berlin moto 100/110 (dépassement inévitable)', () => base(H.dep('Berlin', 'DE'), { transportKey: 'moto', days: 5, maxLegKm: 100, minDistanceKm: 110 })],
  ['Bastia aller-retour 100/150', () => base(H.dep('Bastia', 'FR'), { days: 1, maxLegKm: 100, minDistanceKm: 150 })],
  ['Calais 3 jours 50/80', () => base(H.dep('Calais', 'FR'), { days: 3, maxLegKm: 50, minDistanceKm: 80 })],
  ['Madrid électrique 2 jours 150/110', () => base(H.dep('Madrid', 'ES'), { transportKey: 'voiture-electrique', days: 2, maxLegKm: 150, minDistanceKm: 110 })],
  // nuits par ville (avis days.overMaxPerCity)
  ['Lyon 21 jours, 1 nuit par ville au plus', () => base(H.dep('Lyon', 'FR'), { days: 21, maxDaysPerCity: 1 })],
  ['Lyon 14 jours, 2 nuits par ville au plus', () => base(H.dep('Lyon', 'FR'), { days: 14, maxDaysPerCity: 2 })],
  ['Lyon vélo 4 jours 10 km, 3 nuits max', () => base(H.dep('Lyon', 'FR'), { transportKey: 'velo', days: 4, maxLegKm: 10, minDistanceKm: 12, maxDaysPerCity: 3 })],
  // zones à tension
  ['Acapulco, filtre zones à tension', () => base(H.dep('Acapulco', 'MX'), { days: 4, maxRadiusKm: 150 }), 'tension'],
  ['Maiduguri, filtre zones à tension', () => base(H.dep('Maiduguri', 'NG'), { days: 4, maxRadiusKm: 150 }), 'tension'],
  // îles, enclaves, antiméridien
  ['Suva (antiméridien), rayon 800', () => base(H.dep('Suva', 'FJ'), { days: 5, maxRadiusKm: 800 })],
  ['Magong moto sans ferry', () => base(H.dep('Magong', 'TW'), { transportKey: 'moto', days: 8, maxDaysPerCity: 4, ferryEnabled: false })],
  ['Lerwick électrique', () => base(H.dep('Lerwick', 'GB'), { transportKey: 'voiture-electrique', days: 8 })],
  ['Llívia (enclave)', () => base(H.dep('Llívia', 'ES'), { days: 6 })],
  ['Kaliningrad (exclave), sans ferry', () => base(H.dep('Kaliningrad', 'RU'), { days: 6, ferryEnabled: false })],
  ['Genève, péage coché', () => base(H.dep('Genève', 'CH'), { days: 6 })],
  ['Split, péage coché', () => base(H.dep('Split', 'HR'), { days: 6, maxRadiusKm: 400 })],
];
for(const [name, mk, extra] of TARGETED){
  test('cas ciblé : ' + name, () => {
    const p = mk();
    assert.ok(p.departureCity && isFinite(p.departureCity.lat), 'départ introuvable');
    const problems = [];
    let nonEmpty = 0;
    for(let s = 0; s < TARGET_SEEDS; s++){
      const seed = 3000 + s;
      const t0 = Date.now();
      let r;
      try { r = run(p, seed); } catch(e){ problems.push({ inv: 'exception', msg: e.message, seed, params: p }); continue; }
      const ms = Date.now() - t0;
      if(r.legs.length) nonEmpty++;
      H.check(p, r, ms).v.forEach(x => problems.push(Object.assign({ seed, params: p }, x)));
      if(extra === 'aland') roadLegs(p, r).forEach(([a, b, l]) => { if(cutsAland(a, b)) problems.push({ inv: 'mer', msg: 'étape routière à travers la mer d\'Åland vers ' + l.stop, seed, params: p }); });
      if(extra === 'tension') r.legs.forEach(l => { if(!l.isReturn && l.tension) problems.push({ inv: 'tension', msg: 'étape ' + l.stop + ' en zone à tension', seed, params: p }); });
    }
    assert.equal(problems.length, 0, summarize(problems, 4));
  });
}

test('18e audit : les dates tirées par la campagne restent valides d\'une année sur l\'autre', () => {
  // parseIsoDate n'accepte qu'entre l'année précédente et trois ans plus tard. Les dates de la campagne étaient
  // écrites en dur : à partir de 2028, celle qui couvre 60 % des tirages serait devenue invalide et le moteur
  // serait reparti de la date du jour — sans qu'aucun test ne bronche. Ce contrôle fige l'INTENTION de chaque cas.
  const A = H.engine.__test;
  const an = new Date().getFullYear();
  assert.ok(A.parseIsoDate(an + '-07-14'), 'l\'année en cours doit être acceptée');
  assert.ok(A.parseIsoDate((an + 1) + '-12-31'), 'l\'année suivante doit être acceptée');
  assert.equal(A.parseIsoDate(an + '-02-31'), null, 'le 31 février doit être refusé, pas reporté');
  assert.equal(A.parseIsoDate((an + 5) + '-05-01'), null, 'cinq ans plus tard doit rester hors fenêtre');
});
