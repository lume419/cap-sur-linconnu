// Serveur réel (server.js) démarré sur un port libre, avec un fetch simulé (aucun service tiers sollicité, jamais la
// production). Durée : ~1 min de démarrage (moteur, polices du PDF, précompression ; 2 à 5 min de plus si
// server.js reconstruit son index de recherche dans cache/) + ~1 min de tests.
// Le serveur est arrêté à la fin, même en cas d'échec (after + arrêt à la sortie du processus).
// Journal du serveur : dossier temporaire des tests (voir la première ligne de diagnostic).
// 17e audit du 20/09/2026 : l'export PDF du voyage MAXIMAL est contrôlé sur un échantillon de langues par défaut, et
// sur les 161 avec TEST_FULL=1 (node tests/run.js --full) — ~2,5 min d'exports supplémentaires.
'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { startServer } = require('./helpers/server.js');
const { client, freshIp, missingSecurityHeaders } = require('./helpers/http.js');
const { pdfText, pageCount, isCompletePdf } = require('./helpers/pdf-text.js');
const { FULL } = require('./helpers/config.js');

const ROOT = path.resolve(__dirname, '..');
const PDF_TIME_LIMIT_MS = 6000; // budget de mise en page du serveur (3,5 s) + marge pour la compression et l'envoi
let srv, H;

before(async () => {
  srv = await startServer();
  H = client(srv.port);
}, { timeout: 960000 });

after(() => { if(srv) srv.stop(); });

const sleep = ms => new Promise(r => setTimeout(r, ms));

test('démarrage : /api/status annonce moteur, grilles et polices prêts', { timeout: 30000 }, async t => {
  t.diagnostic('journal du serveur : ' + srv.serverLog);
  const r = await H.get('/api/status');
  assert.equal(r.status, 200);
  const j = JSON.parse(r.body.toString('utf8'));
  assert.equal(j.tripsReady, true);
  assert.ok(j.searchReady, 'recherche indisponible');
  assert.ok(!/indisponible|ÉCHEC/i.test(JSON.stringify([j.landGrid, j.tollGrid, j.pdfFonts])), 'grille ou polices indisponibles : ' + JSON.stringify(j));
});

// --------------------------------------------------------------------------------------------- en-têtes et chemins
test('en-têtes de sécurité sur tous les types de réponses', { timeout: 60000 }, async () => {
  const reqs = [
    ['GET /', () => H.get('/')],
    ['GET /api/status', () => H.get('/api/status')],
    ['GET /js/app.js (br)', () => H.get('/js/app.js', { headers: 'Accept-Encoding: br\r\n' })],
    ['GET /js/theme.js', () => H.get('/js/theme.js')],
    ['GET /api/nope (404 API)', () => H.get('/api/nope')],
    ['GET /nope (404 statique)', () => H.get('/nope')],
    ['GET /data/featured.txt (404)', () => H.get('/data/featured.txt')],
    ['GET /%E0%A4%A (400)', () => H.get('/%E0%A4%A')],
    ['POST generate JSON invalide', () => H.post('/api/generate-trip', '{bad')],
    ['POST export-pdf vide', () => H.post('/api/export-pdf', '{}')],
    ['OPTIONS /', () => H.method('OPTIONS', '/')],
  ];
  const bad = [];
  for(const [name, f] of reqs){
    const r = await f();
    const miss = missingSecurityHeaders(r.headers);
    if(miss.length) bad.push(name + ' (' + r.status + ') sans ' + miss.join(', '));
    if(r.headers['x-powered-by']) bad.push(name + ' : X-Powered-By présent');
    if(r.status >= 500) bad.push(name + ' : statut ' + r.status);
  }
  assert.deepEqual(bad, []);
});

test('/data, fichiers sources et dépôt jamais servis, quelle que soit l\'écriture du chemin', { timeout: 120000 }, async () => {
  const featured = fs.readFileSync(path.join(ROOT, 'public', 'data', 'featured.txt'), 'utf8').slice(0, 40);
  const serverSrc = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8').slice(0, 60);
  const paths = ['/data/featured.txt', '/DATA/featured.txt', '/%64ata/featured.txt', '/data%2Ffeatured.txt', '/data%5Cfeatured.txt', '/js/../data/featured.txt',
    '/./data/featured.txt', '/%2e/data/featured.txt', '//data/featured.txt', '/data/./featured.txt', '/js/%2e%2e/data/featured.txt', '/DaTa%2F..%2Fdata/featured.txt',
    '/data/communes.txt', '/data/communes-bundle.txt', '/data', '/data/', '/js/..%5Cdata/featured.txt', '/%2Fdata/featured.txt',
    '/server.js', '/package.json', '/package-lock.json', '/README.md', '/lib/trip-engine.js', '/scripts/build-tension-zones.js', '/tests/helpers/engine.js',
    '/cache/search-index/countries.json', '/node_modules/express/package.json', '/.git/HEAD', '/..%2Fserver.js', '/..%5Cserver.js', '/%2e%2e/package.json',
    '/js%2F..%2F..%2Fserver.js', '/js/..%2F..%2Flib/pdf-text.js', '/fonts/..%2F..%2Fcache/search-index/countries.json', '/js/..%2F..%2Fdata%2Ffeatured.txt'];
  const bad = [];
  for(const p of paths){
    let r = await H.get(p);
    if(r.status >= 300 && r.status < 400 && r.headers.location) r = await H.get(r.headers.location);
    const body = r.body.toString('utf8');
    if(r.status < 400 || r.status >= 500 || body.includes(featured) || body.includes(serverSrc)) bad.push(p + ' -> ' + r.status + ' (' + r.body.length + ' o)');
  }
  // Témoins : les fichiers publics restent servis.
  for(const p of ['/robots.txt', '/js/theme.js', '/']){ const r = await H.get(p); if(r.status !== 200) bad.push('témoin ' + p + ' -> ' + r.status); }
  assert.deepEqual(bad, []);
});

test('quota des gros fichiers statiques : 30 par minute et par IP, variantes d\'écriture comptées', { timeout: 120000 }, async () => {
  const ip = freshIp();
  const variants = ['/js/i18n.js', '/js/%6918n.js', '/js//i18n.js', '/css/../js/i18n.js', '/JS/i18n.js', '/js/I18N.JS', '/js/%69%31%38%6e.js', '/js/trip-data.js', '/css/style.css', '/js/app.js'];
  const counts = {};
  let firstRefusal = null;
  for(let i = 0; i < 40; i++){
    const r = await H.method('HEAD', variants[i % variants.length], { ip, headers: 'Accept-Encoding: br\r\n' });
    counts[r.status] = (counts[r.status] || 0) + 1;
    if(r.status === 429 && !firstRefusal) firstRefusal = r;
  }
  const served = 40 - (counts[429] || 0);
  assert.ok(served <= 30, 'réponses non refusées : ' + served + ' > 30 ' + JSON.stringify(counts));
  assert.ok(firstRefusal, 'aucun 429');
  assert.deepEqual(missingSecurityHeaders(firstRefusal.headers), [], 'en-têtes de sécurité absents du 429');
  assert.ok(firstRefusal.headers['retry-after'], 'Retry-After absent du 429');
  // Une autre adresse n'est pas touchée.
  const other = await H.method('HEAD', '/js/i18n.js', { headers: 'Accept-Encoding: br\r\n' });
  assert.equal(other.status, 200);
});

// --------------------------------------------------------------------------------------------- export PDF
function checkPdf(r, label, limitMs){
  const problems = [];
  if(r.status !== 200) problems.push(label + ' : statut ' + r.status + ' ' + r.body.toString('utf8').slice(0, 80));
  else {
    if(!/application\/pdf/.test(r.headers['content-type'] || '')) problems.push(label + ' : Content-Type ' + r.headers['content-type']);
    if(!isCompletePdf(r.body)) problems.push(label + ' : PDF incomplet (sans %PDF- ou %%EOF, ' + r.body.length + ' o)');
    else {
      const txt = pdfText(r.body).replace(/\s+/g, ' ');
      if(!/OpenStreetMap/.test(txt) || !/Open Charge Map/.test(txt)) problems.push(label + ' : pied de page (sources, attribution OpenStreetMap) absent');
    }
  }
  if(limitMs && r.ms > limitMs) problems.push(label + ' : ' + r.ms + ' ms > ' + limitMs + ' ms');
  return problems;
}
function bigTrip(lang, n){
  const legs = [];
  for(let i = 0; i < n; i++) legs.push({ label: 'Jour ' + (i + 1), stop: 'Étape ' + i, distanceKm: 100, travelTime: '1h', activities: [{ label: 'Visite du centre' }, { label: 'Musée' }] });
  legs.push({ label: 'Retour', stop: 'Lyon', isReturn: true });
  return { lang, city: 'Lyon', tripLabel: 'Test', legs, packing: ['Carte', 'Lampe'] };
}

test('export PDF : itinéraire de 21 jours valide, complet, dans le budget de temps', { timeout: 150000 }, async () => {
  const r = await H.postPatient('/api/export-pdf', bigTrip('fr', 20));
  assert.deepEqual(checkPdf(r, '21 jours', PDF_TIME_LIMIT_MS), []);
  assert.match(r.headers['content-disposition'] || '', /attachment/);
});

test('export PDF : créneau non monopolisé par un client qui ne lit jamais sa réponse', { timeout: 150000 }, async () => {
  await sleep(3000);
  const body = JSON.stringify(bigTrip('fr', 20));
  const http = require('http');
  // Client lent : envoie sa requête puis ne lit plus rien (tampon réseau plein).
  const slow = await new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: srv.port, path: '/api/export-pdf', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'X-Forwarded-For': freshIp() } }, res => { res.pause(); resolve({ status: res.statusCode, req }); });
    req.on('error', reject);
    req.end(body);
  });
  try {
    assert.equal(slow.status, 200, 'le client lent n\'a pas obtenu son export');
    const r = await H.post('/api/export-pdf', body);
    assert.notEqual(r.status, 503, 'export refusé (« busy ») pendant qu\'un autre client ne lit pas sa réponse');
    assert.deepEqual(checkPdf(r, 'client normal', PDF_TIME_LIMIT_MS), []);
  } finally { slow.req.destroy(); }
});

// Jetons de statistiques et textes longs dans des écritures complexes (tibétain, birman, khmer, bengali) : le
// calcul de largeur et de coupure de ligne a déjà gelé l'export plusieurs secondes.
const SCRIPTS = {
  dz: 'རྫོང་ཁ་ཡིག་གཞུང་ནང་ལུ་ཚིག་ཡིག་ཆ་དང་ཡིག་འབྲུ་མང་པོ་ཡོདཔ་ལས་ ',
  my: 'မြန်မာဘာသာစကားသည် မြန်မာနိုင်ငံ၏ ရုံးသုံးဘာသာစကား ဖြစ်သည် ',
  km: 'ភាសាខ្មែរ គឺជាភាសាកំណើតរបស់ជនជាតិខ្មែរ និងជាភាសាផ្លូវការ ',
  bn: 'বাংলা ভাষা একটি ইন্দো-আর্য ভাষা যা দক্ষিণ এশিয়ার বাঙালি জাতির প্রধান কথ্য ও লেখ্য ভাষা ',
};
const longText = (s, n) => { let t = ''; while(t.length < n) t += s; return t.slice(0, n); };
test('export PDF : jetons de statistiques longs (tibétain, birman, khmer, bengali) dans le budget de temps, pied de page présent', { timeout: 300000 }, async () => {
  const problems = [];
  for(const [lang, s] of Object.entries(SCRIPTS)){
    const bodies = {
      stats: { lang, legs: [{ label: 'x' }], texts: { stats: Array(8).fill(longText(s, 80)) } },
      combo: { lang, tripLabel: longText(s, 60), legs: [{ label: 'x' }], texts: { subtitle: longText(s, 160), stats: Array(8).fill(longText(s, 80)) } },
    };
    for(const [kind, b] of Object.entries(bodies)){
      await sleep(1500);
      const r = await H.postPatient('/api/export-pdf', b);
      problems.push(...checkPdf(r, lang + '/' + kind, PDF_TIME_LIMIT_MS));
    }
  }
  assert.deepEqual(problems, []);
});

test('export PDF : remplissage maximal (25 étapes, écriture tibétaine) dans le budget de temps, pied de page présent', { timeout: 150000 }, async () => {
  const s = SCRIPTS.dz;
  const legs = [];
  for(let i = 0; i < 24; i++) legs.push({ label: 'Jour ' + (i + 1), stop: 'Etape', activities: Array.from({ length: 6 }, () => ({ label: longText(s, 60), typeLabel: longText(s, 20) })) });
  legs.push({ label: 'Retour', stop: 'Lyon', isReturn: true });
  const body = { lang: 'dz', city: 'Lyon', legs, texts: { endMission: longText(s, 300) } };
  while(Buffer.byteLength(JSON.stringify(body)) > 32000) legs.splice(legs.length - 2, 1);
  await sleep(5000);
  const r = await H.postPatient('/api/export-pdf', body);
  assert.deepEqual(checkPdf(r, 'dz 25 étapes', PDF_TIME_LIMIT_MS), []);
});

test('export PDF : objets forgés dans tous les champs -> PDF complet avec pied de page', { timeout: 300000 }, async () => {
  const O = { toString: 1 };
  const all = {
    lang: O, tripLabel: O, city: O, notices: [O, 'van.notice'], packing: [O, {}, []], departureTension: { level: O, label: O },
    stats: { days: O, nights: O, cities: O, totalKm: O, toll: { amount: O, currency: O } },
    texts: { subtitle: O, stats: [O, O], notices: { 'van.notice': O }, departureTension: O, vignette: O, generated: O, generatedDate: O, endMission: O, packTitle: O },
    legs: [
      { label: O, stop: O, country: O, isReturn: O, travelTime: O, roadTime: O, distanceKm: O, roadKm: O, cpBadge: O, checkInLabel: O, tension: { level: O },
        overMaxLeg: { max: O, min: O }, tollInfo: { amount: O, enabled: O, countries: [O] }, ferryInfo: { amount: O, route: O, priceStatus: O },
        chargeInfo: { stops: O, minutes: O, real: O, stations: [O, { near: O }], noChargerNearArrival: O },
        restrictions: [O, { kind: O, type: O, name: O, minCc: O, source: O }], lodgingLinks: { local: [O, null], booking: O, airbnb: O },
        activities: [O, { label: O, typeLabel: O, source: O, sourceLabel: O, hikeUrl: O }],
        texts: { route: O, stop: O, toll: O, ferry: O, charge: O, restrictions: [O], tension: O, overMaxLeg: O, noCharger: O, lodging: O } },
      { label: 'Retour', isReturn: true }
    ]
  };
  const cases = {
    'tous les champs objets': all,
    'tous les champs tableaux': JSON.parse(JSON.stringify(all).replace(/\{"toString":1\}/g, '[[1],{"a":[]}]')),
    'nombres extrêmes': JSON.parse(JSON.stringify(all).replace(/\{"toString":1\}/g, '-1e308')),
    'restrictions.kind objet': { legs: [{ label: 'a', restrictions: [{ kind: O, type: 'lez' }] }] },
    'restrictions.minCc objet': { legs: [{ label: 'a', restrictions: [{ kind: 'moto', type: 'noMotorwayCc', name: 'x', minCc: O }] }] },
    'tollInfo.countries [objet]': { legs: [{ label: 'a', tollInfo: { amount: 1, countries: [O] } }] },
    'roadKm objet': { legs: [{ label: 'a', distanceKm: 1, travelTime: '1h', ferryInfo: {}, roadKm: O }] },
    'chargeInfo __proto__': { legs: [{ label: 'a', chargeInfo: JSON.parse('{"__proto__":{"real":true,"stations":[{"near":"PROTO"}]},"stops":2}') }] },
    'lodgingLinks.local [null]': { legs: [{ label: 'a', checkInLabel: 'x', lodgingLinks: { local: [null, { url: 'https://www.booking.com/', name: O }] } }] },
    'texts.generated sans repères': { legs: [{ label: 'a' }], texts: { generated: '{date}{sources}'.repeat(40) } },
    'texts.generated hostile': { legs: [{ label: 'a' }], texts: { generated: '{date} $& $1 {sources}'.repeat(3) + 'x'.repeat(290) + '{sources}' } },
    'demi-caractères': { tripLabel: '\udc00\udc00\ud800', legs: [{ label: '\ud83d', stop: '\udc00' }] },
  };
  const problems = [];
  for(const [name, b] of Object.entries(cases)){
    await sleep(300);
    const r = await H.postPatient('/api/export-pdf', JSON.stringify(b));
    problems.push(...checkPdf(r, name, PDF_TIME_LIMIT_MS));
  }
  assert.deepEqual(problems, []);
});

test('export PDF : corps invalides refusés proprement (jamais 500)', { timeout: 120000 }, async () => {
  // 300 000 caractères : au-delà de PDF_MAX_BODY (256 ko, 17e audit du 20/09/2026 — c'était 40 000 pour l'ancienne
  // limite de 32 ko, une taille qu'un vrai voyage dépasse pourtant dans une vingtaine de langues).
  const cases = [['{bad', 400], ['null', 400], ['[]', 400], ['{"legs":[]}', 400], [JSON.stringify({ legs: Array(26).fill({ label: 'a' }) }), 400],
    [JSON.stringify({ legs: [{ label: 'x'.repeat(300000) }] }), 413]];
  const bad = [];
  for(const [b, exp] of cases){ const r = await H.postPatient('/api/export-pdf', b); if(r.status !== exp) bad.push(b.slice(0, 30) + ' -> ' + r.status + ' (attendu ' + exp + ')'); }
  assert.deepEqual(bad, []);
});

// --------------------------------------------------------------------------------------------- 12e audit (19/09/2026)
// Liens (/URI) écrits dans un PDF : chaînes littérales de pdfkit, parenthèses et barres obliques inverses échappées.
function pdfUris(buf){
  return [...buf.toString('latin1').matchAll(/\/URI\s*\(((?:\\[\s\S]|[^\\)])*)\)/g)].map(m => m[1].replace(/\\([\\()])/g, '$1'));
}
const flatText = buf => pdfText(buf).replace(/\s+/g, ' ');
// Pas de caractère d'échappement \u dans ce fichier : les caractères spéciaux sont construits par leur code.
const chr = cp => String.fromCodePoint(cp);

test('12e audit, point 1 : pays à vignette du PDF = ceux de trip-data.js (source unique)', { timeout: 120000 }, async () => {
  const C = require(path.join(ROOT, 'public', 'js', 'trip-data.js')).COUNTRIES;
  const expected = Object.keys(C).filter(cc => C[cc].vignette && C[cc].vignette.url).sort();
  assert.ok(['BG', 'RO', 'MD', 'BY', 'CH'].every(cc => expected.includes(cc)), 'trip-data.js : ' + expected.join(','));
  assert.ok(expected.length <= 24);
  const legs = expected.map(cc => ({ label: 'Etape ' + cc, stop: cc, country: cc }));
  legs.push({ label: 'Retour', stop: 'Lyon', isReturn: true });
  await sleep(1500);
  const r = await H.postPatient('/api/export-pdf', { lang: 'fr', city: 'Lyon', legs });
  assert.deepEqual(checkPdf(r, 'vignettes', PDF_TIME_LIMIT_MS), []);
  const uris = new Set(pdfUris(r.body));
  const missing = expected.filter(cc => !uris.has(new URL(C[cc].vignette.url).href));
  assert.deepEqual(missing, [], 'rappel de vignette absent du PDF');
});

test('12e audit, point 2 : caractères distincts comptés après NFC (jamos décomposés -> 413)', { timeout: 60000 }, async () => {
  let pre = '', dec = '';
  for(let i = 0; i < 3000; i++) pre += chr(0xAC00 + i);
  for(let i = 3000; i < 4100; i++) dec += chr(0xAC00 + i).normalize('NFD');
  assert.ok(new Set(pre + dec).size < 4000 && new Set((pre + dec).normalize('NFC')).size > 4000, 'jeu d\'essai');
  const r = await H.postPatient('/api/export-pdf', { lang: 'ko', legs: [{ label: 'a', texts: { stop: pre + dec } }] });
  assert.equal(r.status, 413, 'statut ' + r.status);
});

test('12e audit, point 3 : sauts de ligne des textes client -> nombre de pages borné', { timeout: 120000 }, async () => {
  const body = sep => ({ lang: 'fr', city: 'Lyon',
    legs: Array.from({ length: 8 }, (_, i) => ({ label: ('x' + sep).repeat(55), stop: 'S' + i,
      activities: Array.from({ length: 6 }, () => ({ label: ('x' + sep).repeat(65) })) })),
    packing: Array.from({ length: 30 }, () => ('x' + sep).repeat(55)) });
  await sleep(2000);
  const nl = await H.postPatient('/api/export-pdf', body('\n'));
  await sleep(2000);
  const sp = await H.postPatient('/api/export-pdf', body(' '));
  assert.deepEqual(checkPdf(nl, 'sauts de ligne', PDF_TIME_LIMIT_MS), []);
  const pNl = pageCount(nl.body), pSp = pageCount(sp.body);
  assert.ok(pNl <= pSp + 1 && pNl <= 10, pNl + ' pages avec des sauts de ligne, ' + pSp + ' avec des espaces');
});

test('12e audit, point 4 : liens du PDF écrits sous leur forme analysée, jamais de \\, @, espace ou tabulation', { timeout: 120000 }, async () => {
  const good = 'https://www.booking.com/searchresults.html?ss=Lyon';
  const leg = { label: 'a', stop: 'b', checkInLabel: '20 août', country: 'FR',
    tension: { level: 'orange', source: ' https://www.diplomatie.gouv.fr/fr/conseils aux voyageurs/' },
    lodgingLinks: { booking: 'https://www.booking.com\\@evil.example/phish', airbnb: '\thttps://www.airbnb.fr/s/Ly\ton',
      local: [{ name: 'Local', url: good }, { name: 'Faux', url: 'https://user:pw@www.booking.com/' }, { name: 'Esp', url: ' https://www.booking.com/a b' }] },
    activities: [{ label: 'Rando', hikeUrl: 'https://www.visorando.com/x\\y' }, { label: 'Rando2', hikeUrl: 'https://www.visorando.com/@evil.example' }],
    restrictions: [{ kind: 'van', type: 'lez', name: 'Z', source: 'https://www.booking.com/\t@evil' }] };
  await sleep(1500);
  const r = await H.postPatient('/api/export-pdf', { lang: 'fr', city: 'Lyon', legs: [leg] });
  assert.deepEqual(checkPdf(r, 'liens', PDF_TIME_LIMIT_MS), []);
  const uris = pdfUris(r.body);
  assert.ok(uris.includes(good), 'lien valide absent : ' + JSON.stringify(uris));
  assert.deepEqual(uris.filter(u => /[\\@\s]/.test(u) || /[^\x21-\x7e]/.test(u)), []);
});

test('12e audit, point 5 : /api/status sans chemin de fichier', { timeout: 30000 }, async () => {
  const r = await H.get('/api/status');
  assert.equal(r.status, 200);
  const body = r.body.toString('utf8');
  assert.ok(!/[A-Za-z]:[\\/]|\\\\|\/(home|usr|var|tmp|opt|srv|Users)\//.test(body), body);
  const j = JSON.parse(body);
  assert.ok(!/[\\/]/.test(String(j.pdfFonts || '')), 'pdfFonts : ' + j.pdfFonts);
});

test('12e audit, point 6 : chemin inconnu -> 404 texte court, jamais « Cannot GET »', { timeout: 30000 }, async () => {
  const bad = [];
  for(const [m, p] of [['GET', '/nope'], ['GET', '/js/nope.js'], ['POST', '/nope'], ['HEAD', '/nope/x']]){
    const r = await H.method(m, p);
    const body = r.body.toString('utf8');
    if(r.status !== 404 || /Cannot|<html|<pre/i.test(body)) bad.push(m + ' ' + p + ' -> ' + r.status + ' ' + body.slice(0, 60));
  }
  const api = await H.get('/api/nope');
  if(api.status !== 404 || !/json/.test(api.headers['content-type'] || '')) bad.push('/api/nope -> ' + api.status + ' ' + api.headers['content-type']);
  assert.deepEqual(bad, []);
});

test('12e audit, point 7 : pastille de 120 caractères non tronquée', { timeout: 60000 }, async () => {
  let chip = 'ferry vehicules passagers en plus tarif pour le vehicule seul';
  while(chip.length < 108) chip += ' mot' + chip.length;
  chip = (chip + ' FINPASTILLE').slice(0, 120);
  assert.equal(chip.length, 120);
  await sleep(1500);
  const r = await H.postPatient('/api/export-pdf', { lang: 'fr', legs: [{ label: 'a' }], texts: { stats: ['court', chip] } });
  assert.deepEqual(checkPdf(r, 'pastille', PDF_TIME_LIMIT_MS), []);
  assert.ok(flatText(r.body).includes(chip), 'pastille tronquée');
});

test('12e audit, point 8 : libellé de badge du navigateur repris, badge invalide ignoré', { timeout: 60000 }, async () => {
  const legs = [
    { label: 'Premier', badge: 'BDGOK' },
    { label: 'Deuxieme', badge: 'Y'.repeat(13) },
    { label: 'Troisieme', badge: 'QQ' + chr(0x202E) + 'ZZ' },
    { label: 'Quatrieme', badge: 'WW1\nWW2' },
    { label: 'Cinquieme', badge: { toString: 1 } },
    { label: 'Retour', isReturn: true, badge: 42 }
  ];
  await sleep(1500);
  const r = await H.postPatient('/api/export-pdf', { lang: 'fr', city: 'Lyon', legs });
  assert.deepEqual(checkPdf(r, 'badges', PDF_TIME_LIMIT_MS), []);
  const lines = pdfText(r.body).split('\n').map(s => s.trim());
  assert.ok(lines.includes('BDGOK'), 'badge client absent');
  const txt = lines.join(' ');
  assert.ok(!txt.includes('YYYYYYYYYYYYY') && !txt.includes('QQ') && !txt.includes('WW1'), 'badge invalide repris');
  assert.ok(['2', '3', '4', '5', 'R'].every(b => lines.includes(b)), 'libellé de repli absent : ' + JSON.stringify(lines.filter(l => l.length <= 2)));
});

test('12e audit, point 9 : textes de secours du péage en fourchette (« jusqu\'à »)', { timeout: 60000 }, async () => {
  const legs = [
    { label: 'a', tollInfo: { enabled: true, amount: 12.4, amountMin: 0, amountMax: 12.4 } },
    { label: 'b', tollInfo: { enabled: true, amount: 12, amountMin: 5, amountMax: 12 } },
    { label: 'c', tollInfo: { enabled: false, amount: 12, amountMin: 11.8, amountMax: 12 } },
    { label: 'Retour', isReturn: true }
  ];
  await sleep(1500);
  const r = await H.postPatient('/api/export-pdf', { lang: 'fr', legs, stats: { toll: { enabled: true, amount: 36.4, amountMin: 0, amountMax: 36.4 } } });
  assert.deepEqual(checkPdf(r, 'péage', PDF_TIME_LIMIT_MS), []);
  const txt = flatText(r.body);
  const want = ["jusqu'à ~36,4 € de péage possible", "Péage possible : jusqu'à ~12,4 € selon l'itinéraire", "Péage estimé : ~5,0 à ~12,0 € selon l'itinéraire",
    'Option sans péage : sections à péage évitées (~12,0 €)'];
  assert.deepEqual(want.filter(w => !txt.includes(w)), [], txt.slice(0, 600));
});

// --------------------------------------------------------------------------------------------- 13e audit (19/09/2026)
// Glyphes .notdef (carré vide) dessinés dans un PDF : pdfkit écrit chaque glyphe par son numéro dans le sous-ensemble de
// police incorporé, où le glyphe 0 est toujours .notdef — un code « 0000 » dans une chaîne hexadécimale d'un opérateur
// TJ/Tj est donc un caractère sans glyphe. (Le texte extrait ne suffit pas : la table ToUnicode rend « ⟲ » même dessiné
// en carré vide.)
function notdefCount(buf){
  const zlib = require('zlib');
  let n = 0;
  for(const m of buf.toString('latin1').matchAll(/<<([\s\S]*?)>>\s*stream\r?\n([\s\S]*?)endstream/g)){
    if(/\/(Length1|Subtype\s*\/(Image|Type0|CIDFontType)|Type\s*\/(XObject|Metadata))/.test(m[1])) continue;
    let data = Buffer.from(m[2], 'latin1');
    if(/FlateDecode/.test(m[1])){ try { data = zlib.inflateSync(data); } catch(e){ continue; } }
    const s = data.toString('latin1');
    if(!/\bT[Jj]\b/.test(s)) continue;
    for(const op of s.matchAll(/\[([^\]]*)\]\s*TJ|<([0-9a-fA-F]+)>\s*Tj/g)){
      const hexes = op[1] !== undefined ? [...op[1].matchAll(/<([0-9a-fA-F]*)>/g)].map(x => x[1]) : [op[2]];
      for(const h of hexes) for(let i = 0; i + 4 <= h.length; i += 4) if(h.slice(i, i + 4) === '0000') n++;
    }
  }
  return n;
}
// Moitié isolée d'une paire de substitution (demi-emoji).
function hasLoneSurrogate(s){
  for(let i = 0; i < s.length; i++){
    const c = s.charCodeAt(i);
    if(c >= 0xD800 && c <= 0xDBFF){ const d = s.charCodeAt(i + 1); if(d >= 0xDC00 && d <= 0xDFFF){ i++; continue; } return true; }
    if(c >= 0xDC00 && c <= 0xDFFF) return true;
  }
  return false;
}

test('13e audit, point 1 : badge « ⟲ » du retour -> « R », aucun glyphe manquant ; chiffres des 161 langues acceptés', { timeout: 120000 }, async () => {
  // Chiffres de chaque langue de l'interface (même lecture de SUPPORTED que server.js) et tiret des plages : dessinables.
  const PdfText = require(path.join(ROOT, 'lib', 'pdf-text.js'));
  const src = fs.readFileSync(path.join(ROOT, 'public', 'js', 'i18n.js'), 'utf8').slice(0, 20000);
  const langs = src.match(/var SUPPORTED = \[([^\]]*)\]/)[1].split(',').map(x => x.trim().replace(/^'|'$/g, '')).filter(Boolean);
  assert.ok(langs.length >= 150, langs.length + ' langues');
  const refused = langs.map(l => {
    let nf;
    try { nf = new Intl.NumberFormat(l); } catch(e){ nf = new Intl.NumberFormat('fr'); }
    return [l, nf.format(1234567890) + chr(0x2013) + nf.format(9)];
  }).filter(x => !PdfText.canRender(x[1])).map(x => x.join(':'));
  assert.deepEqual(refused, []);
  assert.equal(PdfText.canRender(chr(0x27F2)), false);
  const deva3 = chr(0x969);
  const legs = [
    { label: 'Premier', badge: chr(0x663) + chr(0x2013) + chr(0x665) },
    { label: 'Deuxieme', badge: deva3 },
    { label: 'Retour', isReturn: true, badge: chr(0x27F2) }
  ];
  await sleep(1500);
  const r = await H.postPatient('/api/export-pdf', { lang: 'fr', city: 'Lyon', legs });
  assert.deepEqual(checkPdf(r, 'badge retour', PDF_TIME_LIMIT_MS), []);
  assert.equal(notdefCount(r.body), 0, 'glyphe manquant (.notdef) dans le PDF');
  const lines = pdfText(r.body).split('\n').map(s => s.trim());
  assert.ok(lines.includes('R'), 'badge « R » absent : ' + JSON.stringify(lines.filter(l => l.length <= 3)));
  assert.ok(!lines.join(' ').includes(chr(0x27F2)), 'badge « ⟲ » repris');
  assert.ok(lines.includes(deva3), 'chiffre devanagari refusé');
  // Témoin : « ⟲ » dans un autre texte est bien dessiné en .notdef (la méthode de contrôle détecte le défaut).
  await sleep(1500);
  const t = await H.postPatient('/api/export-pdf', { lang: 'fr', city: 'Lyon', legs: [{ label: 'x', texts: { stop: 'avant ' + chr(0x27F2) + ' apres' } }] });
  assert.ok(notdefCount(t.body) >= 1, 'contrôle .notdef inopérant');
});

test('13e audit, point 3 : 7 emoji en badge, emoji coupé par clip -> jamais de demi-caractère', { timeout: 120000 }, async () => {
  const emoji = chr(0x1F600);
  const legs = [
    { label: 'a'.repeat(118) + emoji + 'b', badge: emoji.repeat(7) },
    { label: 'Deuxieme', badge: 'OK' + emoji },
    { label: 'Retour', isReturn: true }
  ];
  await sleep(1500);
  const r = await H.postPatient('/api/export-pdf', { lang: 'fr', city: 'Lyon', legs });
  assert.deepEqual(checkPdf(r, 'emoji', PDF_TIME_LIMIT_MS), []);
  const txt = pdfText(r.body);
  assert.ok(!hasLoneSurrogate(txt), 'demi-caractère dans le texte du PDF');
  assert.equal(notdefCount(r.body), 0, 'glyphe manquant (.notdef) dans le PDF');
  const lines = txt.split('\n').map(s => s.trim());
  assert.ok(lines.includes('1') && lines.includes('2'), 'numéro de repli absent : ' + JSON.stringify(lines.filter(l => l.length <= 3)));
  assert.ok(txt.replace(/\s+/g, '').includes('a'.repeat(118) + chr(0x2026)), 'libellé coupé ailleurs qu\'avant l\'emoji');
});

test('13e audit, point 2 : vélo -> aucun rappel de vignette ; voiture -> rappel présent', { timeout: 120000 }, async () => {
  const C = require(path.join(ROOT, 'public', 'js', 'trip-data.js')).COUNTRIES;
  const vignetteHrefs = new Set(Object.keys(C).filter(cc => C[cc].vignette && C[cc].vignette.url).map(cc => new URL(C[cc].vignette.url).href));
  const chHref = new URL(C.CH.vignette.url).href;
  const body = transportKey => ({ lang: 'fr', city: 'Lyon', transportKey, legs: [
    { label: 'Jour 1', stop: 'Berne', country: 'CH', texts: { vignettes: [{ country: 'CH', text: 'Vignette suisse' }, { country: 'AT', text: 'Vignette autrichienne' }] } },
    { label: 'Jour 2', stop: 'Vienne', country: 'AT' },
    { label: 'Retour', stop: 'Lyon', isReturn: true }
  ] });
  await sleep(1500);
  const velo = await H.postPatient('/api/export-pdf', body('velo'));
  assert.deepEqual(checkPdf(velo, 'vélo', PDF_TIME_LIMIT_MS), []);
  assert.deepEqual(pdfUris(velo.body).filter(u => vignetteHrefs.has(u)), [], 'lien de vignette dans un PDF à vélo');
  assert.ok(!/Vignette/i.test(flatText(velo.body)), 'rappel de vignette dans un PDF à vélo');
  await sleep(1500);
  const car = await H.postPatient('/api/export-pdf', body('voiture-thermique'));
  assert.ok(pdfUris(car.body).includes(chHref), 'lien de vignette absent en voiture');
  // Clé inconnue : ignorée (comportement d'avant, rappel présent).
  await sleep(1500);
  const unknown = await H.postPatient('/api/export-pdf', body('trottinette'));
  assert.ok(pdfUris(unknown.body).includes(chHref), 'clé de transport inconnue non ignorée');
});

test('13e audit, point 4 : distanceUnit « mi » -> textes de secours en miles, autre valeur -> km', { timeout: 120000 }, async () => {
  const body = distanceUnit => ({ lang: 'fr', city: 'Lyon', distanceUnit, stats: { days: 2, totalKm: 1609 }, legs: [
    { label: 'Jour 1', stop: 'A', distanceKm: 161, travelTime: '2h', overMaxLeg: { max: 300, min: 483 },
      chargeInfo: { stops: 0, noChargerNearArrival: true } },
    { label: 'Jour 2', stop: 'B', distanceKm: 40.2, travelTime: '3h', roadKm: 80.47, roadTime: '1h',
      ferryInfo: { route: 'X - Y', amount: 50 } },
    { label: 'Retour', stop: 'Lyon', isReturn: true }
  ] });
  await sleep(1500);
  const mi = flatText((await H.postPatient('/api/export-pdf', body('mi'))).body);
  const wantMi = ['~1000 mi au total', '~ 2h de route · 100 mi', '~ 1h de route · 50 mi + ~ 3h de traversée · 25 mi',
    'distance maximale entre étapes (186 mi)', 'éloignement minimum demandé (300 mi)', 'à moins de 12 mi de'];
  assert.deepEqual(wantMi.filter(w => !mi.includes(w)), [], mi.slice(0, 900));
  assert.ok(!/\d km\b/.test(mi), 'distance en km restante : ' + mi.slice(0, 900));
  await sleep(1500);
  const km = flatText((await H.postPatient('/api/export-pdf', body('xx'))).body);
  const wantKm = ['~1609 km au total', '~ 2h de route · 161 km', '~ 1h de route · 80 km + ~ 3h de traversée · 40 km',
    'distance maximale entre étapes (300 km)', 'éloignement minimum demandé (483 km)', 'à moins de 20 km de'];
  assert.deepEqual(wantKm.filter(w => !km.includes(w)), [], km.slice(0, 900));
  assert.ok(!/\d mi\b/.test(km), 'distance en miles avec distanceUnit « xx »');
});

test('13e audit, point 5 : corps imbriqué au-delà de 64 niveaux refusé (400), journal sans texte envoyé', { timeout: 120000 }, async () => {
  // Avant : un « toString » imbriqué au-delà de la profondeur nettoyée par stripConversionTraps (64) faisait lever
  // Number() en pleine mise en page -> PDF coupé sans pied de page. Refusé désormais avant toute mise en page.
  let deep = { toString: 1, marque: 'SECRET-CLIENT-13' };
  for(let i = 0; i < 70; i++) deep = [deep];
  const before = fs.readFileSync(srv.serverLog, 'utf8').length;
  await sleep(1500);
  const r = await H.postPatient('/api/export-pdf', { lang: 'fr', city: 'Lyon', legs: [{ label: 'SECRET-LABEL-13', tollInfo: { enabled: true, amountMax: deep } }] });
  assert.equal(r.status, 400);
  await sleep(500);
  const log = fs.readFileSync(srv.serverLog, 'utf8').slice(before);
  const lines = log.split('\n').filter(l => /export-pdf|erreur/i.test(l));
  assert.ok(!/SECRET|Cannot convert|primitive/.test(log), 'texte client ou message d\'erreur dans le journal : ' + JSON.stringify(lines));
  // Témoin : le même contenu à faible profondeur passe (200).
  const ok = await H.postPatient('/api/export-pdf', { lang: 'fr', city: 'Lyon', legs: [{ label: 'x', tollInfo: { enabled: true, amountMax: 12 } }] });
  assert.equal(ok.status, 200);
});

test('14e audit : une réponse d\'erreur non lue ne garde pas le créneau d\'export PDF', { timeout: 60000 }, async () => {
  // Connexion enchaînée (HTTP/1.1) qui ne lit jamais : un gros fichier puis un export invalide. La réponse 400 attend
  // derrière le fichier, « finish » ne se déclenche pas : avant, le créneau restait pris ~5 s (503 pour tout le monde).
  const net = require('net');
  const ip = freshIp();
  const sock = net.connect(srv.port, '127.0.0.1');
  sock.pause();
  await new Promise(r => sock.on('connect', r));
  const body = '{}';
  sock.write('GET /js/i18n.js HTTP/1.1\r\nHost: localhost\r\nAccept-Encoding: identity\r\nX-Forwarded-For: ' + ip + '\r\n\r\n' +
    'POST /api/export-pdf HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/json\r\nContent-Length: ' + body.length +
    '\r\nX-Forwarded-For: ' + ip + '\r\n\r\n' + body);
  try {
    await sleep(600);
    const valid = { lang: 'fr', city: 'Lyon', legs: [{ label: 'Jour 1', stop: 'A' }, { label: 'Retour', isReturn: true }] };
    const r = await H.post('/api/export-pdf', valid);
    assert.equal(r.status, 200, 'export d\'un autre visiteur refusé (' + r.status + ') pendant qu\'une réponse d\'erreur attend');
  } finally { sock.destroy(); }
});

test('14e audit : badge fait de caractères invisibles refusé (repli sur le numéro)', { timeout: 60000 }, async () => {
  const r = await H.postPatient('/api/export-pdf', { lang: 'fr', city: 'Lyon',
    legs: [{ label: 'Jour 1', stop: 'A', badge: '\u200B\u200D' }, { label: 'Retour', isReturn: true, badge: '\u00AD' }] });
  assert.equal(r.status, 200);
  const txt = flatText(r.body);
  assert.ok(/\b1\b/.test(txt) && /\bR\b/.test(txt), 'replis « 1 » et « R » absents : ' + txt.slice(0, 200));
});

// --------------------------------------------------------------------------------------------- appels sortants
test('file des appels sortants : des requêtes abandonnées en attente ne bloquent pas l\'adresse', { timeout: 120000 }, async t => {
  srv.setMock({ delayMs: { overpass: 3000 }, wiki: 'status:404' });
  try {
    const ip = freshIp();
    const t0 = Date.now();
    const ps = [];
    for(let i = 0; i < 8; i++) ps.push(H.get('/api/pois?lat=' + (44 + i * 0.1).toFixed(4) + '&lon=4.5&country=IT&name=', { ip, abortAfterMs: 300 }));
    await Promise.all(ps);
    const r = await H.get('/api/pois?lat=43.5000&lon=4.5&country=IT&name=', { ip, timeout: 60000 });
    await sleep(1000);
    const calls = srv.outbound(t0, 'overpass').length;
    t.diagnostic('requête suivante : ' + r.status + ' en ' + r.ms + ' ms ; appels Overpass : ' + calls);
    assert.equal(r.status, 200, 'requête légitime de la même adresse refusée : ' + r.status + ' ' + r.body.toString('utf8').slice(0, 80));
    assert.ok(r.ms < 12000, 'requête légitime servie après ' + r.ms + ' ms (les requêtes abandonnées ont occupé la file)');
    assert.ok(calls <= 2, calls + ' appels Overpass : les requêtes abandonnées ont été exécutées quand même');
  } finally { srv.setMock({}); }
});

test('routes à appels sortants : paramètres forgés et service tiers en panne -> jamais 500', { timeout: 180000 }, async () => {
  const paths = ['/api/pois?lat=1e-7&lon=4.83&country=FR&name=Lyon', '/api/pois?lat=45.76&lon=4.83&country=FR&name=Lyon%0A%22%5D%3B%28out%3B%29&dept=69',
    '/api/pois?lat=Infinity&lon=4.83&country=FR', '/api/pois?lat=45.76&lon=4.83&country=__proto__', '/api/pois?lat=45.76&lon=4.83&country=FR&name[]=a&name[]=b',
    '/api/photo?name=Lyon&lang=api&lat=45.76&lon=4.83', '/api/photo?name=..%2F..%2Fw%2Fapi.php&lang=fr', '/api/photo?name=Lyon&lang=fr&kind=__proto__',
    '/api/photo?name=%ED%A0%80&lang=fr', '/api/hike?name=Lyon&country=__proto__&lat=45.76&lon=4.83', '/api/hike?name=Lyon&country=IT&lat=45.76&lon=4.83&lang=toString',
    '/api/search-city?q=%ED%A0%80abc', '/api/search-city?q=abc&limit=1e9&country=__proto__&lang=__proto__', '/api/search-city?q[toString]=1'];
  const bad = [];
  for(const mode of ['ok', 'status:500', 'reset', 'badjson']){
    srv.setMock({ overpass: mode, wiki: mode, wikitext: mode, wikidata: mode, visorando: mode });
    for(const p of paths){
      const r = await H.get(p.replace('Lyon', 'Lyon' + mode.length), { timeout: 60000 });
      if(r.status >= 500 && r.status !== 503) bad.push(mode + ' ' + p + ' -> ' + r.status);
      if(r.status === 0) bad.push(mode + ' ' + p + ' -> pas de réponse (' + r.err + ')');
    }
  }
  srv.setMock({});
  assert.deepEqual(bad, []);
});

// --------------------------------------------------------------------------------------------- tirage
test('generate-trip : entrées forgées -> 200 ou 400, jamais 500', { timeout: 600000 }, async () => {
  const D = { lat: 45.76, lon: 4.83, country: 'FR', name: 'Lyon' };
  const cases = {
    'tirage normal': { departureCity: D, days: 3 },
    'days=1e308': { departureCity: D, days: 1e308 }, 'days="3"': { departureCity: D, days: '3' }, 'days=[3]': { departureCity: D, days: [3] },
    'country=__proto__': { departureCity: { lat: 1, lon: 1, country: '__proto__' }, days: 3 }, 'country=constructor': { departureCity: { lat: 1, lon: 1, country: 'constructor' }, days: 3 },
    'lat="45.76"': { departureCity: Object.assign({}, D, { lat: '45.76' }), days: 3 }, 'lat=[45.76]': { departureCity: Object.assign({}, D, { lat: [45.76] }), days: 3 },
    'lat=true': { departureCity: Object.assign({}, D, { lat: true, lon: true }), days: 3 },
    'allCps 2000': { departureCity: Object.assign({}, D, { allCps: Array(2000).fill('69001') }), days: 3 },
    'allCps objets': { departureCity: Object.assign({}, D, { allCps: [{}, []], cp: {} }), days: 3 },
    'transportKey=constructor': { departureCity: D, days: 3, transportKey: 'constructor' }, 'transportKey=__proto__': { departureCity: D, days: 3, transportKey: '__proto__' },
    'budgetKey objet': { departureCity: D, days: 3, budgetKey: {} }, 'tripStart 9999': { departureCity: D, days: 3, tripStart: '9999-99-99' },
    'tripStart objet': { departureCity: D, days: 3, tripStart: { toString: 1 } }, 'avoidNorm objet': { departureCity: D, days: 3, avoidNorm: { a: 1 } },
    'avoidNorm long': { departureCity: D, days: 3, avoidNorm: 'é'.repeat(5000) }, 'preferredCurrency __proto__': { departureCity: D, days: 3, preferredCurrency: '__proto__' },
    'min > max': { departureCity: D, days: 3, minDistanceKm: 500, maxDistanceKm: 100 }, 'maxRadius -1': { departureCity: D, days: 3, maxRadiusKm: -1 },
    'minDaysPerCity 1e9': { departureCity: D, days: 3, minDaysPerCity: 1e9, maxDaysPerCity: 1e9 }, 'maxLegKm "NaN"': { departureCity: D, days: 3, maxLegKm: 'NaN' },
    'avoidTension "false"': { departureCity: D, days: 3, avoidTension: 'false' },
    'imbrication profonde': JSON.parse('{"departureCity":' + '{"a":'.repeat(2000) + '1' + '}'.repeat(2000) + ',"days":3}'),
    'name objet': { departureCity: Object.assign({}, D, { name: {} }), days: 3 }, 'dept objet': { departureCity: Object.assign({}, D, { dept: { toString: 1 } }), days: 3 },
    'Antarctique 21 j': { departureCity: { lat: -77.85, lon: 166.67, country: 'AQ', name: 'x' }, days: 21 },
    'lat 90 lon 180': { departureCity: { lat: 90, lon: 180, country: 'FR', name: 'x' }, days: 21 },
    'lat -90 lon -180 NZ': { departureCity: { lat: -90, lon: -180, country: 'NZ', name: 'x' }, days: 21, maxRadiusKm: 3000 },
    'corps null': null, 'corps tableau': [], 'departureCity absent': { days: 3 },
  };
  const bad = [];
  let normal = null;
  for(const [name, b] of Object.entries(cases)){
    await sleep(200);
    const r = await H.postPatient('/api/generate-trip', JSON.stringify(b), { timeout: 60000, maxWaitMs: 90000 });
    let j = null; try { j = JSON.parse(r.body.toString('utf8')); } catch(e){}
    if(r.status !== 200 && r.status !== 400) bad.push(name + ' -> ' + r.status + ' ' + r.body.toString('utf8').slice(0, 80));
    else if(!j) bad.push(name + ' -> réponse non JSON');
    else if(r.status === 400 && (typeof j.error !== 'string' || /TypeError|RangeError|at \w+ \(/.test(j.error))) bad.push(name + ' -> message d\'erreur interne exposé : ' + j.error);
    if(name === 'tirage normal') normal = j;
  }
  assert.deepEqual(bad, []);
  assert.ok(normal && Array.isArray(normal.legs) && normal.legs.length === 3, 'le tirage normal doit renvoyer 3 journées');
});

test('generate-trip et en-têtes : corps trop gros, mauvais type de contenu -> 4xx', { timeout: 60000 }, async () => {
  const bad = [];
  const checks = [
    ['17 ko', () => H.post('/api/generate-trip', JSON.stringify({ a: 'x'.repeat(17000) })), 413],
    ['text/plain', () => H.post('/api/generate-trip', '{}', { contentType: 'text/plain' }), null],
    ['charset latin1', () => H.post('/api/generate-trip', '{}', { contentType: 'application/json; charset=latin1' }), 415],
  ];
  for(const [name, f, exp] of checks){
    const r = await f();
    if(r.status >= 500 || r.status < 400 || (exp && r.status !== exp)) bad.push(name + ' -> ' + r.status);
  }
  assert.deepEqual(bad, []);
});

// --------------------------------------------------------------------------------------------- 15e audit du 19/09/2026
test('15e audit : total de secours du PDF jamais arrondi à 0 (0,5-0,8 km en miles) ; traversée estimée « environ », tarif inconnu', { timeout: 120000 }, async () => {
  const body = (distanceUnit, totalKm) => ({ lang: 'fr', city: 'Lyon', distanceUnit, stats: { days: 2, totalKm }, legs: [
    { label: 'Jour 1', stop: 'A', distanceKm: 40, travelTime: '1h30', roadKm: 10, roadTime: '15min',
      ferryInfo: { route: 'X - Y', amount: null, priceStatus: 'unknown', durationEstimated: true, durationH: 1.5 } },
    { label: 'Retour', stop: 'Lyon', isReturn: true }
  ] });
  const bad = [];
  for(const [unit, km, want] of [['mi', 0.5, null], ['mi', 0.8, null], ['mi', 0.81, '~1 mi au total'], ['mi', 1.6, '~1 mi au total'], ['xx', 0.6, '~1 km au total'], ['xx', 2, '~2 km au total']]){
    await sleep(1500);
    const r = await H.postPatient('/api/export-pdf', body(unit, km));
    const txt = flatText(r.body);
    if(r.status !== 200){ bad.push(unit + ' ' + km + ' -> ' + r.status); continue; }
    if(/~\s*0 (mi|km) au total/.test(txt)) bad.push(unit + ' ' + km + ' km : total arrondi à 0 (' + txt.slice(0, 300) + ')');
    if(want && !txt.includes(want)) bad.push(unit + ' ' + km + ' km : « ' + want + ' » absent (' + txt.slice(0, 300) + ')');
    if(!txt.includes('environ 1 h 30 min de traversée') || !txt.includes('Tarif non communiqué')) bad.push(unit + ' : traversée estimée mal décrite (' + txt.slice(0, 600) + ')');
    if(/X - Y[^.]*€/.test(txt)) bad.push(unit + ' : prix affiché pour une traversée estimée');
  }
  assert.deepEqual(bad, []);
});

test('15e audit : nom « .. », « . » ou fait de points et d\'espaces -> réponse normale sans aucun appel sortant', { timeout: 120000 }, async () => {
  srv.setMock({});
  const names = ['..', '.', '...', '%20..%20', '.%09.', '%2E%2E', '%2e', '.%20.', '%C2%A0.%C2%A0'];
  const bad = [];
  for(const n of names){
    const t0 = Date.now();
    const paths = ['/api/photo?name=' + n + '&lang=fr&lat=45.76&lon=4.83', '/api/photo?name=' + n + '&lang=fr&dept=69&country=FR',
      '/api/pois?lat=45.7' + names.indexOf(n) + '&lon=4.83&country=FR&name=' + n + '&dept=69',
      '/api/hike?name=' + n + '&country=FR&lat=45.76&lon=4.83&lang=fr'];
    for(const p of paths){
      const r = await H.get(p, { ip: freshIp(), timeout: 30000 });
      let json = null;
      try { json = JSON.parse(r.body.toString('utf8')); } catch(e){}
      if(r.status !== 200 || !json) bad.push(p + ' -> ' + r.status + ' ' + r.body.toString('utf8').slice(0, 80));
      else if(json.image || (json.pois && json.pois.length) || (json.hikes && json.hikes.length) || (json.portals && json.portals.length)) bad.push(p + ' -> ' + JSON.stringify(json).slice(0, 120));
    }
    await sleep(300);
    const calls = srv.outbound(t0);
    if(calls.length) bad.push(JSON.stringify(n) + ' : ' + calls.length + ' appel(s) sortant(s), ex. ' + calls[0].url);
  }
  // Nom ordinaire : les appels sortants ont bien lieu (le filtre ne bloque pas tout).
  const t1 = Date.now();
  const ok = await H.get('/api/photo?name=Lyon15&lang=fr&lat=45.76&lon=4.83', { ip: freshIp(), timeout: 30000 });
  assert.equal(ok.status, 200);
  await sleep(300);
  assert.ok(srv.outbound(t1, 'wiki').length >= 1, 'aucun appel Wikipédia pour un nom ordinaire');
  assert.ok(srv.outbound(t1, 'wiki').every(c => !/\/summary\/(\.|%2e)/i.test(c.url)));
  assert.deepEqual(bad, []);
});

// --------------------------------------------------------------------------------------------- 16e audit du 20/09/2026

// Fonctions PURES de server.js, sans rien démarrer : source extraite (déclarations de premier niveau) et exécutée dans
// un bac à sable — comme tests/ui.test.js le fait pour app.js. Un nom absent est simplement ignoré (le test échoue
// alors sur le comportement, pas sur l'extraction).
// `consts` (17e audit du 20/09/2026) : constantes de premier niveau déclarées sur UNE ligne (`const NOM = …;`), reprises
// telles quelles — les fonctions extraites s'en servent (pickHikeTags et son motif d'étiquettes, cacheSet et son
// plafond par défaut).
function serverFns(names, consts){
  const lines = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8').split('\n');
  const out = [], found = [];
  for(const n of consts || []){
    const line = lines.find(l => l.startsWith('const ' + n + ' = '));
    assert.ok(line, 'constante ' + n + ' introuvable dans server.js');
    out.push(line);
  }
  for(const n of names){
    const i = lines.findIndex(l => l.startsWith('function ' + n + '('));
    if(i < 0) continue;
    const j = /\}\s*$/.test(lines[i]) ? i : lines.findIndex((l, k) => k > i && l === '}');
    if(j < i) continue;
    out.push(lines.slice(i, j + 1).join('\n'));
    found.push(n);
  }
  // PdfText : plusieurs fonctions extraites s'en servent — même module que celui chargé par server.js.
  // PdfService : depuis le 17e audit, distinctChars lui demande si un caractère a une variante grasse (il répond sans
  // charger les polices, grâce à la liste que le fil de travail lui envoie). Ici, pas de fil à démarrer pour si peu :
  // on répond avec les polices elles-mêmes, ce que le service fait aussi quand il n'a pas de fil.
  const PdfText = require(path.join(ROOT, 'lib', 'pdf-text.js'));
  const ctx = { module: { exports: {} }, console, PdfText: PdfText, PdfService: { hasBoldVariant: PdfText.hasBoldVariant } };
  vm.createContext(ctx);
  vm.runInContext(out.join('\n') + '\nmodule.exports = { ' + found.concat(consts || []).join(', ') + ' };', ctx);
  return ctx.module.exports;
}

test('16e audit : une étiquette wikimedia_commons qui ne désigne pas un fichier ne produit plus d\'URL d\'image', () => {
  const F = serverFns(['isDotsOnlyName', 'isCommonsFileName', 'commonsFileUrl']);
  const call = v => { try { return F.commonsFileUrl(v); } catch(e){ return 'exception ' + e.message; } };
  const bad = [];
  // « .. », « . », un espace de noms, un chemin, un nom sans extension : Special:FilePath rendrait une PAGE HTML.
  for(const v of ['..', '.', ' . ', '...', 'Category:Église de Thoiry', 'Creator:X', 'Category:Thoiry.jpg', 'a/b.jpg', 'Thoiry', '', null]){
    const u = call(v);
    if(u !== null) bad.push(JSON.stringify(v) + ' -> ' + JSON.stringify(u));
  }
  // Témoins : de vrais noms de fichiers restent acceptés, et le nom est bien encodé dans le chemin.
  for(const v of ['Thoiry.jpg', 'Église Saint-Pierre (Thoiry).JPG', 'X.png', 'Vue d\'ensemble.jpeg']){
    const u = call(v);
    if(!/^https:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\/[^\s]+$/.test(String(u))) bad.push('refusé à tort : ' + JSON.stringify(v) + ' -> ' + JSON.stringify(u));
  }
  assert.deepEqual(bad, []);
});

test('16e audit : casse du nom — un résultat vide n\'empoisonne plus le cache d\'une autre casse', { timeout: 180000 }, async () => {
  // Wikipédia n'ignore la casse que sur la PREMIÈRE lettre d'un titre : « tHOIRY16 » et « Thoiry16 » sont deux articles
  // différents. Le vide mis en cache pour l'un ne doit plus être servi à l'autre pendant 24 h.
  const q = n => '/api/photo?name=' + encodeURIComponent(n) + '&lang=fr&lat=45.76&lon=4.83';
  srv.setMock({ wiki: 'status:404' });
  const empty = await H.get(q('tHOIRY16'), { ip: freshIp(), timeout: 30000 });
  assert.equal(empty.status, 200);
  assert.equal(JSON.parse(empty.body.toString('utf8')).image, null, 'le témoin « tHOIRY16 » devait rester sans photo');
  srv.setMock({});
  await sleep(300);

  const t0 = Date.now();
  const r = await H.get(q('Thoiry16'), { ip: freshIp(), timeout: 30000 });
  await sleep(300);
  const j = JSON.parse(r.body.toString('utf8'));
  assert.ok(j.image, '« Thoiry16 » a reçu le résultat vide mis en cache pour « tHOIRY16 » : ' + JSON.stringify(j));
  assert.ok(srv.outbound(t0, 'wiki').length >= 1, 'aucun appel Wikipédia pour « Thoiry16 » (entrée de cache partagée avec « tHOIRY16 »)');

  // La seule différence de casse que Wikipédia ignore VRAIMENT (première lettre) partage toujours une entrée : pas de
  // cache doublé pour rien.
  const t1 = Date.now();
  const same = await H.get(q('thoiry16'), { ip: freshIp(), timeout: 30000 });
  await sleep(300);
  assert.equal(JSON.parse(same.body.toString('utf8')).image, j.image);
  assert.deepEqual(srv.outbound(t1, 'wiki'), [], '« thoiry16 » n\'a pas réutilisé l\'entrée de « Thoiry16 »');
});

test('16e audit : code de département en minuscules (« 2a ») traité comme « 2A »', { timeout: 120000 }, async () => {
  // « 2a » n'était pas une clé de DEPARTMENTS : la désambiguïsation « Nom (Corse-du-Sud) » n'était pas tentée, alors que
  // la clé de cache (mise en minuscules) était la même que celle de « 2A ».
  srv.setMock({});
  const t0 = Date.now();
  const r = await H.get('/api/photo?name=Cargese16&lang=fr&dept=2a&country=FR&lat=41.99&lon=8.59', { ip: freshIp(), timeout: 30000 });
  assert.equal(r.status, 200);
  await sleep(300);
  const titles = srv.outbound(t0, 'wiki').map(c => { try { return decodeURIComponent(c.url); } catch(e){ return c.url; } });
  assert.ok(titles.some(u => u.includes('Cargese16 (Corse-du-Sud)')),
    '« dept=2a » n\'a pas tenté la désambiguïsation corse : ' + JSON.stringify(titles));
});

test('16e audit : distances des textes de secours du PDF — jamais « 0 mi », ni négatif, ni 1e+308', { timeout: 120000 }, async () => {
  const legs = [
    { label: 'Jour 1', stop: 'A', distanceKm: 0.8, travelTime: '10min' },            // 0,5 mi -> arrondi à 0
    { label: 'Jour 2', stop: 'B', distanceKm: -50, travelTime: '1h' },               // valeur négative
    { label: 'Jour 3', stop: 'C', distanceKm: 1e308, travelTime: '2h' },             // 6.21e+307 mi
    { label: 'Jour 4', stop: 'D', distanceKm: 0, travelTime: '5min' },               // distance nulle
    { label: 'Jour 5', stop: 'E', distanceKm: 40, travelTime: '3h', roadKm: 0.8, roadTime: '15min',
      ferryInfo: { route: 'X - Y', amount: 50 } },                                   // partie routière à 0 mi
    { label: 'Jour 6', stop: 'F', distanceKm: 161, travelTime: '2h' },               // témoin : 100 mi
    { label: 'Retour', stop: 'Lyon', isReturn: true }
  ];
  await sleep(1500);
  const r = await H.postPatient('/api/export-pdf', { lang: 'fr', city: 'Lyon', distanceUnit: 'mi', stats: { days: 6, totalKm: 1609 }, legs });
  assert.equal(r.status, 200);
  const txt = flatText(r.body);
  const bad = [];
  if(/(^|[^\d.,])0 mi\b/.test(txt)) bad.push('« 0 mi » présent');
  if(/-\s*\d+\s*mi\b/.test(txt)) bad.push('distance négative présente');
  if(/e\+\d{2,}/.test(txt)) bad.push('distance en notation exponentielle présente');
  // Séparateur orphelin : « de route · » sans rien derrière.
  if(/de (route|traversée)\s*·\s*(·|$|~)/.test(txt)) bad.push('séparateur « · » sans distance');
  // Témoins : la durée reste écrite pour ces étapes, et la distance valable est toujours là.
  for(const w of ['~ 10min de route', '~ 1h de route', '~ 2h de route', '~ 2h de route · 100 mi', '~ 3h de traversée · 25 mi']){
    if(!txt.includes(w)) bad.push('témoin absent : « ' + w + ' »');
  }
  // Partie routière d'une traversée dont la distance s'arrondit à 0 : bloc entier omis, jamais « 15min de route · 0 mi ».
  if(/15min de route/.test(txt)) bad.push('partie routière à 0 mi conservée');
  assert.deepEqual(bad, [], txt.slice(0, 900));
});

test('16e audit : /api/photo refuse les titres d\'un autre espace de noms, sans appel sortant', { timeout: 120000 }, async () => {
  srv.setMock({});
  const bad = [];
  for(const n of ['File:X.jpg', 'Fichier:X.jpg', 'Utilisateur:Bob', 'Category:Foo', 'Spécial:Recherche', 'Discussion:Lyon']){
    const t0 = Date.now();
    const r = await H.get('/api/photo?name=' + encodeURIComponent(n) + '&lang=fr&lat=45.76&lon=4.83', { ip: freshIp(), timeout: 30000 });
    let j = null;
    try { j = JSON.parse(r.body.toString('utf8')); } catch(e){}
    if(r.status !== 200 || !j) bad.push(n + ' -> ' + r.status);
    else if(j.image || j.wikiUrl) bad.push(n + ' -> ' + JSON.stringify(j).slice(0, 120));
    await sleep(300);
    const calls = srv.outbound(t0);
    if(calls.length) bad.push(JSON.stringify(n) + ' : ' + calls.length + ' appel(s) sortant(s), ex. ' + calls[0].url);
  }
  // Témoin : un nom ordinaire passe toujours.
  const t1 = Date.now();
  const ok = await H.get('/api/photo?name=Lyon16b&lang=fr&lat=45.76&lon=4.83', { ip: freshIp(), timeout: 30000 });
  assert.equal(ok.status, 200);
  await sleep(300);
  if(!srv.outbound(t1, 'wiki').length) bad.push('aucun appel Wikipédia pour un nom ordinaire');
  assert.deepEqual(bad, []);
});

// --------------------------------------------------------------------------------------------- 17e audit du 20/09/2026

// ---- Charge utile d'export PDF d'un voyage MAXIMAL, dans une langue donnée ----
// Équivalent sans navigateur de buildTripExportPayload (public/js/app.js) : mêmes champs, mêmes clés de traduction,
// lues dans le VRAI public/js/i18n.js. 21 journées (la dernière est le retour), 15 villes distinctes, voiture
// électrique avec pauses recharge sur bornes réelles, traversée en ferry, péage, vignette, restrictions van ET moto,
// zone à tension, randonnée résolue + 2 POI par jour (buildActivityOptions en produit 3), hébergement avec ses liens.
// Sert à mesurer le pire cas du corps envoyé à /api/export-pdf et à vérifier qu'il passe dans les 161 langues.
const MAX_TRIP_CITIES = ['Ljubljana', 'Bled', 'Trieste', 'Portoroz', 'Rijeka', 'Zadar', 'Split', 'Dubrovnik', 'Mostar',
  'Sarajevo', 'Kotor', 'Podgorica', 'Shkoder', 'Tirana', 'Ohrid'];
const MAX_TRIP_CC = ['SI', 'IT', 'HR', 'BA', 'ME', 'AL', 'MK', 'RS', 'BG', 'RO', 'HU', 'AT', 'SK', 'CZ', 'PL'];
const MAX_TRIP_VIGNETTES = ['SI', 'AT', 'CH', 'CZ', 'SK', 'HU', 'RO', 'BG', 'MD', 'BY'];
const MAX_TRIP_DAYS = 21;
let i18nSandbox = null;
function loadI18nForPdf(){
  if(i18nSandbox) return i18nSandbox;
  let src = fs.readFileSync(path.join(ROOT, 'public', 'js', 'i18n.js'), 'utf8');
  const i = src.lastIndexOf('window.I18N = {');
  assert.ok(i > 0, 'window.I18N introuvable dans i18n.js');
  src = src.slice(0, i) + 'window.__L = LISTS; ' + src.slice(i);
  const fakeEl = () => ({ setAttribute(){}, getAttribute(){ return null; }, classList: { add(){}, remove(){}, contains(){ return false; } },
    appendChild(){}, addEventListener(){}, querySelector(){ return fakeEl(); }, querySelectorAll(){ return []; }, style: {}, textContent: '' });
  const ctx = { window: {}, navigator: { languages: ['fr'] }, localStorage: { getItem: () => null, setItem(){} },
    document: { readyState: 'complete', documentElement: fakeEl(), querySelectorAll: () => [], getElementById: () => null, createElement: fakeEl, addEventListener(){} },
    CustomEvent: function(){}, Intl, console };
  ctx.window.addEventListener = () => {}; ctx.window.dispatchEvent = () => {};
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  i18nSandbox = { I18N: ctx.window.I18N, L: ctx.window.__L, langs: Array.from(ctx.window.I18N.SUPPORTED) };
  return i18nSandbox;
}
function maxTripPayload(lang){
  const { I18N, L } = loadI18nForPdf();
  I18N.set(lang);
  const t = (k, v) => I18N.t(k, v);
  let nf;
  try { nf = new Intl.NumberFormat(lang); } catch(e){ nf = new Intl.NumberFormat('fr'); }
  const num = n => nf.format(n), dist = n => num(n) + ' km', money = n => '~' + num(n) + ' €';
  const dateOf = d => { try { return new Intl.DateTimeFormat(nf.resolvedOptions().locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(d); } catch(e){ return '4 juillet 2026'; } };
  const range = dateOf(new Date(Date.UTC(2026, 6, 4))) + ' – ' + dateOf(new Date(Date.UTC(2026, 6, 5)));
  const noticeKeys = ['van.notice', 'charge.dataNote', 'days.overMaxPerCity'];
  const notices = {};
  noticeKeys.forEach(k => { notices[k] = t(k); });
  const texts = {
    subtitle: t('pdf.subtitle', { city: MAX_TRIP_CITIES[0] }),
    stats: [num(MAX_TRIP_DAYS) + ' ' + t('stats.days'), num(15) + ' ' + t('stats.cities'), num(MAX_TRIP_DAYS - 1) + ' ' + t('stats.nights'),
      '~' + dist(6480) + ' ' + t('stats.totalKm'), t('stats.ferryKm', { km: dist(412) }),
      t('stats.upTo', { amount: money(186.4) }) + ' ' + t('stats.tollPossible'), money(342) + ' ' + t('stats.ferryTotalVehicles'),
      num(2) + ' ' + t('stats.ferryUnpriced'), money(58) + ' ' + t('stats.trainTotal')],
    notices: notices,
    departureTension: t('tension.label') + ' — ' + t('tension.departure') + ' ' + t('tension.red'),
    lodgingNone: t('lodging.noPlatform'),
    endMission: t('end.label') + ' — ' + t('end.text'),
    packTitle: t('pack.title'),
    packSub: t('pack.sub', { transport: t('transport.voitureElectrique.label'), budget: t('form.budget.confortable') }),
    generated: t('pdf.generated'),
    truncated: t('pdf.truncated'),
    generatedDate: dateOf(new Date(Date.UTC(2026, 6, 4))),
    currencyNote: t('currency.linkFallback', { currency: 'EUR', chosen: 'CHF' }),
    vignette: t('vignette.label') + ' — ' + t('vignette.notice')
  };
  const legs = [];
  for(let i = 0; i < MAX_TRIP_DAYS; i++){
    const isReturn = i === MAX_TRIP_DAYS - 1;
    const city = MAX_TRIP_CITIES[i % MAX_TRIP_CITIES.length], country = MAX_TRIP_CC[i % MAX_TRIP_CC.length];
    const lt = {
      overMaxLeg: t('leg.overMaxLeg', { max: dist(320), min: dist(480) }),
      route: t('day.routeTime', { time: num(1) + ' h ' + num(20), dist: dist(96) }) + ' + ' + t('day.crossingTime', { time: num(3) + ' h ' + num(30), dist: dist(213) }),
      stop: t(isReturn ? 'day.returnTo' : 'day.stepMystery', { stop: city + ' (' + num(21000 + i) + ')' }),
      toll: t('toll.label', { source: 'ASFA + AISCAT' }) + ' — ' + t('toll.estimatedRange', { min: money(12.3), max: money(24.6) }) + ' ' + t('toll.estimateNote'),
      charge: t('charge.label') + ' — ' + t('charge.realN', { n: num(3), min: num(75), places: 'Postojna, Vrhnika, Logatec' }),
      noCharger: t('charge.noChargerNearArrival', { dist: dist(20) }),
      restrictions: [t('van.lez', { name: city }), t('moto.noMotorwayCc', { name: city, cc: num(125) })],
      ferry: t('ferry.label') + ' — ' + t('ferry.textPriced', { route: 'Split — Ancona', price: t('ferry.price.vehicle', { amount: money(96), foot: money(42) }),
        duration: t('ferry.durationApprox', { duration: num(11) + ' h' }) }) + ' ' + t('ferry.price.variable'),
      lodging: t('lodging.find', { range: range })
    };
    if(!isReturn) lt.tension = t('tension.label') + ' — ' + t('tension.orange');
    if(i < MAX_TRIP_VIGNETTES.length){
      lt.vignettes = [{ country: MAX_TRIP_VIGNETTES[i], text: t('vignette.label') + ' — ' + t('vignette.notice'),
        url: 'https://www.evignette.example/' + MAX_TRIP_VIGNETTES[i].toLowerCase() }];
    }
    legs.push({
      texts: lt, badge: num(i + 1), label: t(isReturn ? 'day.nReturn' : 'day.n', { n: num(i + 1) }), stop: city,
      cpBadge: String(21000 + i), isReturn: isReturn, distanceKm: 213.4, travelTime: num(3) + ' h ' + num(30),
      roadKm: 96.2, roadTime: num(1) + ' h ' + num(20), country: country,
      tollInfo: { enabled: true, amount: 24.6, amountMin: 12.3, amountMax: 24.6, countries: [country, 'IT'] },
      chargeInfo: { stops: 3, minutes: 75, real: true, noChargerNearArrival: true,
        stations: [{ near: 'Postojna', lat: 45.7768, lon: 14.2075 }, { near: 'Vrhnika', lat: 45.9667, lon: 14.2939 }, { near: 'Logatec', lat: 45.9174, lon: 14.2261 }] },
      restrictions: [{ kind: 'van', type: 'lez', name: city, country: country }, { kind: 'moto', type: 'noMotorwayCc', name: city, country: country, minCc: 125 }],
      overMaxLeg: { max: 320, min: 480 },
      tension: isReturn ? null : { level: 'orange', source: 'https://www.diplomatie.gouv.fr/fr/conseils-aux-voyageurs/conseils-par-pays-destination/' + city.toLowerCase() + '/' },
      ferryInfo: { route: 'Split — Ancona', amount: 96, priceStatus: 'variable', priceCovers: 'vehicle', footAmount: 42,
        durationEstimated: true, mode: 'ferry', durationH: 11 },
      checkInLabel: range,
      lodgingLinks: { airbnb: 'https://www.airbnb.fr/s/' + encodeURIComponent(city) + '/homes?currency=EUR&price_max=180',
        booking: 'https://www.booking.com/searchresults.html?ss=' + encodeURIComponent(city) + '&selected_currency=EUR&nflt=price%3DEUR-0-180-1',
        local: [{ name: 'Booking ' + city, url: 'https://www.booking.com/city/' + country.toLowerCase() + '/' + city.toLowerCase() + '.html' }] },
      activities: [{ label: 'Sentier des cretes de ' + city, source: 'OpenStreetMap',
          typeLabel: [num(12) + ' km', num(4) + ' h ' + num(30), t('hike.difficulty.medium')].join(' · '),
          hikeUrl: 'https://hiking.waymarkedtrails.org/#route?id=1234567',
          sourceLabel: t('hike.sourceLabel', { source: 'OpenStreetMap' }).replace(/\s*↗\s*$/, '') },
        { label: 'Muzej sodobne umetnosti (' + city + ')', typeLabel: t('poiType.museum'), source: null, hikeUrl: null },
        { label: 'Stari grad (' + city + ')', typeLabel: t('poiType.castle'), source: null, hikeUrl: null }]
    });
  }
  const lists = L[lang] || L.fr;
  const packing = [].concat(lists['pack.base'] || [], lists['pack.voitureElectrique'] || [], lists['pack.confortable'] || []);
  return {
    lang: lang, texts: texts, transportKey: 'voiture-electrique', distanceUnit: 'km', city: MAX_TRIP_CITIES[0],
    tripLabel: MAX_TRIP_CITIES[0] + ' → ' + MAX_TRIP_CITIES[1] + ' · 2026-07-04 → 2026-07-24',
    budgetLabel: t('form.budget.confortable'), transportLabel: t('transport.voitureElectrique.label'),
    stats: { days: MAX_TRIP_DAYS, cities: 15, nights: MAX_TRIP_DAYS - 1, totalKm: 6480.4, ferryKm: 412.6,
      toll: { enabled: true, amount: 186.4, amountMin: 92.1, amountMax: 186.4 } },
    notices: noticeKeys,
    departureTension: { level: 'red', source: 'https://www.diplomatie.gouv.fr/fr/conseils-aux-voyageurs/' },
    legs: legs, packing: packing.length ? packing : ['Carte', 'Lampe']
  };
}

// Échantillon par défaut : les 12 plus grosses charges utiles mesurées (écritures birmane, tibétaine, tamoule,
// malayalam, géorgienne, bengalie, devanagari, khmère, singhalaise, thaïe) plus une langue de chaque autre famille
// (latine, CJK, arabe RTL, thâna RTL, éthiopienne, yi, tifinagh, cyrillique, grecque, arménienne, vietnamienne, venda).
const PDF_SAMPLE_LANGS = ['dz', 'my', 'ta', 'ml', 'ka', 'bn', 'mr', 'ne', 'km', 'si', 'hi', 'th',
  'fr', 'ja', 'ko', 'zh-Hant', 'ar', 'dv', 'am', 'ii', 'zgh', 'ru', 'el', 'hy', 'vi', 've'];

test('17e audit, point 1 : export PDF d\'un voyage MAXIMAL (21 jours, 15 villes) — 200, document complet, aucun glyphe manquant',
  { timeout: FULL ? 1800000 : 600000 }, async t => {
  const { langs } = loadI18nForPdf();
  assert.equal(langs.length, 161, langs.length + ' langues dans i18n.js');
  const list = FULL ? langs : PDF_SAMPLE_LANGS;
  t.diagnostic(FULL ? 'les 161 langues' : list.length + ' langues sur 161 (TEST_FULL=1 / node tests/run.js --full pour les 161)');
  const problems = [], sizes = [], truncatedLangs = [];
  let maxMs = 0, maxPages = 0;
  for(const lang of list){
    const body = JSON.stringify(maxTripPayload(lang));
    const bytes = Buffer.byteLength(body, 'utf8');
    sizes.push([lang, bytes]);
    const r = await H.postPatient('/api/export-pdf', body, { timeout: 120000 });
    if(r.status !== 200){ problems.push(lang + ' (' + bytes + ' o) : statut ' + r.status + ' ' + r.body.toString('utf8').slice(0, 90)); continue; }
    if(!/application\/pdf/.test(r.headers['content-type'] || '')){ problems.push(lang + ' : Content-Type ' + r.headers['content-type']); continue; }
    if(!isCompletePdf(r.body)){ problems.push(lang + ' : PDF incomplet (sans %PDF- ou %%EOF, ' + r.body.length + ' o)'); continue; }
    const raw = pdfText(r.body);
    // Pied de page : noms de sources, identiques dans toutes les langues (voir `sources` de buildTripPdf).
    const txt = raw.replace(/\s+/g, ' ');
    if(!txt.includes('OpenStreetMap') || !txt.includes('Open Charge Map')) problems.push(lang + ' : pied de page (sources, attribution OpenStreetMap) absent');
    const nd = notdefCount(r.body);
    if(nd) problems.push(lang + ' : ' + nd + ' glyphe(s) manquant(s) (.notdef)');
    const pages = pageCount(r.body);
    if(pages < 3 || pages > 40) problems.push(lang + ' : ' + pages + ' pages');
    if(r.ms > PDF_TIME_LIMIT_MS) problems.push(lang + ' : ' + r.ms + ' ms > ' + PDF_TIME_LIMIT_MS + ' ms');
    // Toutes les villes ne tiennent pas toujours : le budget de mise en page (PDF_BUILD_BUDGET_MS, 3,5 s) peut écourter
    // le document dans les écritures les plus coûteuses. Le lecteur en est alors averti (texts.truncated) et le pied de
    // page reste présent — signalé en diagnostic, ce n'est pas un échec de l'export.
    const cities = MAX_TRIP_CITIES.filter(c => raw.replace(/\s+/g, '').includes(c)).length;
    if(cities < MAX_TRIP_CITIES.length) truncatedLangs.push(lang + ' (' + cities + '/' + MAX_TRIP_CITIES.length + ')');
    maxMs = Math.max(maxMs, r.ms);
    maxPages = Math.max(maxPages, pages);
  }
  sizes.sort((a, b) => b[1] - a[1]);
  const all = sizes.map(x => x[1]).sort((a, b) => a - b);
  t.diagnostic('corps : min ' + all[0] + ' o, médiane ' + all[Math.floor(all.length / 2)] + ' o, max ' + all[all.length - 1] + ' o (' + sizes[0][0] + ')');
  t.diagnostic('10 plus grosses : ' + sizes.slice(0, 10).map(x => x[0] + ' ' + x[1]).join(', '));
  t.diagnostic('pire temps ' + maxMs + ' ms, pages max ' + maxPages + ' ; mise en page écourtée (budget de temps) : ' + (truncatedLangs.join(', ') || 'aucune'));
  assert.deepEqual(problems, []);
  // Le voyage doit tenir ENTIER, dans toutes les langues. Avant la mise en forme mémorisée (voir memoiseLayout dans
  // lib/pdf-text.js), quatre langues épuisaient le budget de mise en page avant la dernière journée et rendaient un
  // document signé mais incomplet : hi 13/15 villes, mr 10/15, bn 10/15, dz 5/15. Le contrôle dépend de la vitesse de
  // la machine, comme perf.test.js : s'il casse, c'est que la marge (3,1 s mesurées pour 3,5 s de budget) a disparu.
  assert.deepEqual(truncatedLangs, [], 'mise en page écourtée : le voyage n\'est pas rendu en entier dans ces langues');
});

// ------------------------------------------------- recherche de ville en POST (17e audit du 20/09/2026)
// En production, le pare-feu de l'hébergement répond 404 À LA PLACE du site pour certaines URL contenant de
// l'écriture arabe : la requête n'atteint jamais Node, et 7 des 25 plus grandes villes dont le nom arabe est publié
// étaient introuvables (Mumbai, Mexico, Karachi, Delhi, Moscou, Ho Chi Minh-Ville, Harbin). Le même texte passe dans
// le CORPS d'un POST. Ces contrôles vérifient que le POST rend EXACTEMENT ce que rend le GET, quelle que soit
// l'écriture, et qu'il n'ouvre aucune porte (corps aberrant, saisie trop longue, quotas).
test('17e audit : /api/search-city en POST rend le même résultat que le GET, dans toutes les écritures', { timeout: 120000 }, async () => {
  const saisies = ['Lyon', 'Zürich', 'تهران', 'القاهرة', 'مومباي', 'موسكو', 'Москва', '北京', 'Αθήνα', '100-0002', 'cn-22', 'علی\u200cآباد کشمر'];
  const écarts = [];
  for(const q of saisies){
    const g = await H.get('/api/search-city?q=' + encodeURIComponent(q) + '&limit=8&country=FR&lang=fr');
    const p = await H.post('/api/search-city', JSON.stringify({ q: q, limit: 8, country: 'FR', lang: 'fr' }), { headers: 'Content-Type: application/json\r\n' });
    if(g.status !== 200 || p.status !== 200){ écarts.push(q + ' : GET ' + g.status + ', POST ' + p.status); continue; }
    const rg = JSON.parse(g.body.toString('utf8')).results, rp = JSON.parse(p.body.toString('utf8')).results;
    if(JSON.stringify(rg) !== JSON.stringify(rp)) écarts.push(q + ' : GET ' + rg.length + ' résultats, POST ' + rp.length + ' — contenus différents');
    if(!rg.length) écarts.push(q + ' : aucun résultat (la saisie devrait trouver un lieu)');
  }
  assert.deepEqual(écarts, []);
});

test('17e audit : /api/search-city en POST — corps aberrants refusés, mêmes bornes que le GET', { timeout: 120000 }, async () => {
  const bad = [];
  const cas = [
    ['corps vide', '', 400], ['corps non objet', '"Lyon"', 400], ['tableau', '["Lyon"]', 400],
    ['sans q', '{"limit":8}', 400], ['q vide', '{"q":""}', 400], ['q non chaîne', '{"q":{"toString":1}}', 400],
    ['q de 121 caractères', JSON.stringify({ q: 'a'.repeat(121) }), 400],
    ['q de 120 caractères', JSON.stringify({ q: 'a'.repeat(120) }), 200]
  ];
  for(const [label, corps, attendu] of cas){
    const r = await H.post('/api/search-city', corps);
    if(r.status !== attendu) bad.push(label + ' : ' + r.status + ' au lieu de ' + attendu + ' (' + r.body.toString('utf8').slice(0, 60) + ')');
  }
  // Corps plus gros que la limite de 2 ko : refusé avant d'atteindre la recherche.
  const gros = await H.post('/api/search-city', JSON.stringify({ q: 'Lyon', x: 'a'.repeat(4000) }));
  if(gros.status !== 413) bad.push('corps de 4 ko : ' + gros.status + ' au lieu de 413');
  // Les quotas portent sur le CHEMIN, pas sur la méthode : le POST est compté comme le GET.
  const ip = freshIp();
  let vu429 = false;
  for(let i = 0; i < 70 && !vu429; i++){
    const r = await H.post('/api/search-city', JSON.stringify({ q: 'Lyon' + i }), { ip: ip });
    if(r.status === 429) vu429 = true;
  }
  if(!vu429) bad.push('aucun 429 après 70 recherches en POST depuis la même adresse : le quota ne s\'applique pas');
  assert.deepEqual(bad, []);
});

// ------------------------------------------------------- export PDF déporté dans un fil de travail (17e audit)
// La mise en page est synchrone : tant qu'elle tournait dans le processus qui répond, le site entier se taisait
// pendant 0,1 à 3,1 s à chaque export. Ces deux contrôles vérifient ce qui compte : le serveur RÉPOND pendant un
// export, et le document rendu par le fil est le MÊME que celui du repli interne.

test('17e audit : le serveur répond pendant un export PDF (mise en page déportée dans un fil)', { timeout: 300000 }, async () => {
  const body = JSON.stringify(maxTripPayload('dz')); // l'écriture la plus coûteuse à mettre en page
  await H.postPatient('/api/export-pdf', body, { timeout: 120000 }); // chauffe : fil démarré, caches remplis
  const délais = [];
  let fini = false;
  const sonde = (async () => {
    while(!fini){
      const t = Date.now();
      try { await fetch('http://127.0.0.1:' + srv.port + '/api/status', { headers: { 'X-Forwarded-For': '10.9.9.9' } }); } catch(e){}
      délais.push(Date.now() - t);
      await new Promise(r => setTimeout(r, 20));
    }
  })();
  const r = await H.postPatient('/api/export-pdf', body, { timeout: 120000 });
  fini = true;
  await sonde;
  assert.equal(r.status, 200, 'export refusé : ' + r.body.toString('utf8').slice(0, 120));
  assert.ok(isCompletePdf(r.body), 'PDF incomplet');
  délais.sort((a, b) => a - b);
  const pire = délais[délais.length - 1];
  // Mesure du 20/09/2026 : 16 ms de médiane et 18 ms au pire avec le fil, contre 391 ms quand la mise en page tournait
  // dans le processus principal (et bien plus sur un cache froid : la mise en page va jusqu'à 3,1 s). Le seuil est
  // large pour ne pas dépendre de la charge de la machine ; il attrape le retour du blocage, pas une lenteur passagère.
  assert.ok(délais.length >= 3, 'trop peu de sondes pendant l\'export (' + délais.length + ') : le serveur ne répondait pas');
  assert.ok(pire < 200, '/api/status a mis ' + pire + ' ms pendant un export : la mise en page bloque de nouveau la boucle ' +
    '(médiane ' + délais[délais.length >> 1] + ' ms sur ' + délais.length + ' sondes)');
});

test('17e audit : le fil de travail et le repli interne rendent le MÊME document', { timeout: 300000 }, async () => {
  // Le service est testé directement : c'est le seul moyen d'exercer le repli, qui ne se déclenche autrement que
  // lorsque le fil meurt. Le repli est obtenu comme en vrai — en laissant le délai de réponse expirer (18e audit du
  // 21/09/2026) — et non plus par stop(), qui refuse désormais tout nouveau travail (le serveur s'arrête).
  const travail = { trip: maxTripPayload('dz'), title: 'Cap sur l\'inconnu - essai', lang: 'dz', glyphMax: 6000 };
  const chemin = path.join(ROOT, 'lib', 'pdf-service.js');

  const Fil = require(chemin);
  const parLeFil = await Fil.build(travail);
  assert.equal(parLeFil.source, 'fil', 'le fil n\'a pas fait le travail (statut ' + JSON.stringify(Fil.status()) + ')');
  assert.ok(parLeFil.pdf && parLeFil.pdf.length > 50000, 'document vide ou minuscule (' + (parLeFil.pdf && parLeFil.pdf.length) + ' o)');
  assert.ok(parLeFil.ms > 0, 'temps de calcul du fil non rapporté : il ne serait plus imputé au quota de l\'adresse');
  await Fil.stop();

  // Seconde instance, avec un délai de réponse ramené à 60 ms : la mise en page (~0,3 à 3 s) ne peut pas tenir
  // dedans, le fil est donc perdu en cours de travail et le travail repart en repli — le chemin réel.
  delete require.cache[require.resolve(chemin)];
  process.env.PDF_REPONSE_MAX_MS = '60';
  const Repli = require(chemin);
  delete process.env.PDF_REPONSE_MAX_MS;
  try {
    const parLeRepli = await Repli.build(travail);
    assert.equal(parLeRepli.source, 'local', 'le repli ne s\'est pas déclenché alors que le fil a expiré');
    assert.ok(parLeRepli.ms > 0, 'temps de calcul du repli non rapporté');
    // Seuls la date de création et l'identifiant du document changent d'un export à l'autre, par construction.
    const sansHorodatage = b => b.toString('latin1').replace(/\(D:\d{14}Z?\)/g, '(D:X)').replace(/\/ID\s*\[[^\]]*\]/g, '/ID[X]');
    assert.equal(sansHorodatage(parLeFil.pdf), sansHorodatage(parLeRepli.pdf), 'le fil et le repli ne rendent pas le même document');
  } finally {
    await Repli.stop();
    delete require.cache[require.resolve(chemin)];
  }
});

// ------------------------------------------------- faille de déni de service du 18e audit (21/09/2026)
// 200 exports envoyés puis aussitôt abandonnés (connexion coupée, chacun depuis une adresse différente et donc sous
// son quota) empilaient 200 mises en page dans le fil ; au premier dépassement du délai de réponse, TOUS les travaux
// en vol étaient rejetés d'un coup et repartaient en mise en page SYNCHRONE dans le processus principal — 69
// d'affilée, boucle d'événements figée 39 s (mesuré). Trois garanties le corrigent, une par test ci-dessous.

test('18e audit : une rafale d\'exports abandonnés ne coûte rien — le suivant reste rapide', { timeout: 300000 }, async () => {
  const corps = JSON.stringify(maxTripPayload('dz'));
  await H.postPatient('/api/export-pdf', corps, { timeout: 120000 }); // chauffe
  const seul = Date.now();
  const témoin = await H.postPatient('/api/export-pdf', corps, { timeout: 120000 });
  const seulMs = Date.now() - seul;
  assert.equal(témoin.status, 200, 'export témoin refusé');

  // 40 exports envoyés puis coupés 15 ms après, chacun depuis une adresse neuve.
  const net = require('net');
  const abandonner = ip => new Promise(resolve => {
    const c = net.connect(srv.port, '127.0.0.1', () => {
      c.write('POST /api/export-pdf HTTP/1.1\r\nHost: localhost\r\nX-Forwarded-For: ' + ip +
        '\r\nContent-Type: application/json\r\nContent-Length: ' + Buffer.byteLength(corps) + '\r\n\r\n');
      c.write(corps);
      setTimeout(() => { c.destroy(); resolve(); }, 15);
    });
    c.on('error', () => resolve());
  });
  for(let i = 0; i < 40; i++){ abandonner('10.77.' + ((i >> 8) & 255) + '.' + (i & 255)); await new Promise(r => setTimeout(r, 12)); }

  // Un export légitime juste après doit rester du même ordre de grandeur : si les 40 travaux abandonnés avaient été
  // mis en page, il attendrait leur tour (mesuré à l'époque : plusieurs dizaines de secondes).
  const t0 = Date.now();
  const après = await H.postPatient('/api/export-pdf', corps, { timeout: 120000 });
  const aprèsMs = Date.now() - t0;
  assert.equal(après.status, 200, 'export refusé après la rafale : ' + après.body.toString('utf8').slice(0, 100));
  assert.ok(isCompletePdf(après.body), 'PDF incomplet après la rafale');
  const plafond = Math.max(4000, seulMs * 4);
  assert.ok(aprèsMs < plafond, 'export après 40 abandons : ' + aprèsMs + ' ms (seul : ' + seulMs + ' ms, plafond ' +
    plafond + ') — les travaux abandonnés sont encore calculés');
});

test('18e audit : un travail dont le demandeur est parti est abandonné SANS être mis en page', { timeout: 300000 }, async () => {
  // Deux protections rendent la rafale d'exports abandonnés inoffensive : la file bornée et l'abandon des travaux
  // sans destinataire. Le test précédent les éprouve ensemble (il échoue si les deux sautent) ; celui-ci isole la
  // seconde, pour qu'aucune des deux ne puisse disparaître en silence.
  const chemin = path.join(ROOT, 'lib', 'pdf-service.js');
  delete require.cache[require.resolve(chemin)];
  process.env.PDF_FILE_MAX = '64'; // file large : seul l'abandon peut épargner le travail
  const S = require(chemin);
  delete process.env.PDF_FILE_MAX;
  try {
    const travail = { trip: maxTripPayload('dz'), title: 'essai', lang: 'dz', glyphMax: 6000 };
    const enCours = S.build(travail);                       // occupe le fil
    const partis = [S.build(travail, () => true), S.build(travail, () => true), S.build(travail, () => true)];
    const t0 = Date.now();
    const r = await Promise.all([enCours].concat(partis));
    const ms = Date.now() - t0;
    assert.ok(r[0].pdf && r[0].pdf.length > 50000, 'le travail légitime n\'a pas abouti');
    for(let i = 1; i < 4; i++){
      assert.equal(r[i].source, 'abandonné', 'travail ' + i + ' mis en page alors que son demandeur était parti (' + r[i].source + ')');
      assert.equal(r[i].ms, 0, 'travail ' + i + ' : du temps de calcul a été dépensé pour personne (' + r[i].ms + ' ms)');
      assert.equal(r[i].pdf, null, 'travail ' + i + ' : un document a été produit pour personne');
    }
    // Trois documents en moins : l'ensemble doit coûter à peu près le temps d'UN seul export.
    assert.ok(ms < 20000, 'quatre travaux dont trois abandonnés ont pris ' + ms + ' ms');
  } finally {
    await S.stop();
    delete require.cache[require.resolve(chemin)];
  }
});

test('18e audit : file d\'attente bornée — au-delà, « busy » tout de suite, jamais d\'empilement', { timeout: 300000 }, async () => {
  const corps = JSON.stringify(maxTripPayload('dz'));
  await H.postPatient('/api/export-pdf', corps, { timeout: 120000 }); // chauffe
  // 10 exports SIMULTANÉS, adresses distinctes (chacune sous son quota de 10/min).
  const réponses = await Promise.all(Array.from({ length: 10 }, (v, i) =>
    H.post('/api/export-pdf', corps, { ip: '10.88.0.' + i })));
  const codes = réponses.map(r => r.status).sort();
  const inattendus = codes.filter(c => c !== 200 && c !== 503);
  assert.deepEqual(inattendus, [], 'statuts inattendus : ' + JSON.stringify(codes));
  assert.ok(codes.includes(503), 'aucun refus : 10 exports simultanés ont tous été acceptés (' + JSON.stringify(codes) + ')');
  assert.ok(codes.includes(200), 'aucun export n\'a abouti (' + JSON.stringify(codes) + ')');
  // Le service reste sain juste après : un export ordinaire repasse.
  const après = await H.postPatient('/api/export-pdf', corps, { timeout: 120000 });
  assert.equal(après.status, 200, 'service cassé après la rafale simultanée');
});

test('19e audit : c\'est bien la FILE qui refuse au-delà de sa borne, pas le créneau d\'export', { timeout: 300000 }, async () => {
  // Le test HTTP ci-dessus envoie dix exports simultanés et constate des 503. Mais la route a DEUX protections :
  // `pdfExportSlot` (server.js, un export à la fois, depuis le 17e audit) et la file bornée du service (18e audit).
  // Démontré au 19e audit : en rendant la file infinie (FILE_MAX = 1e9), les soixante tests serveur restaient verts —
  // les 503 venaient tous du créneau, jamais de la file. Ce contrôle-ci s'adresse au module directement, sans route
  // ni créneau, et prouve que c'est bien FILE_MAX qui décide : la MÊME rafale, servie avec deux bornes différentes,
  // doit donner strictement plus de documents avec la borne la plus large. Une file non bornée sert tout dans les
  // deux cas, et le test tombe.
  const chemin = path.join(ROOT, 'lib', 'pdf-service.js');
  const complet = maxTripPayload('dz');
  const travail = { trip: Object.assign({}, complet, { legs: complet.legs.slice(0, 2) }), title: 'essai', lang: 'dz', glyphMax: 6000 };
  async function rafale(borne){
    delete require.cache[require.resolve(chemin)];
    process.env.PDF_FILE_MAX = String(borne);
    const S = require(chemin);
    delete process.env.PDF_FILE_MAX;
    try {
      const r = await Promise.allSettled(Array.from({ length: 8 }, () => S.build(travail)));
      const servis = r.filter(x => x.status === 'fulfilled' && x.value.pdf && x.value.pdf.length > 1000).length;
      const refusés = r.filter(x => x.status === 'rejected' && x.reason && x.reason.busy).length;
      const autres = r.filter(x => x.status === 'rejected' && !(x.reason && x.reason.busy)).map(x => String(x.reason && x.reason.message));
      return { servis, refusés, autres };
    } finally {
      await S.stop();
      delete require.cache[require.resolve(chemin)];
    }
  }
  const étroite = await rafale(2);
  const large = await rafale(6);
  assert.deepEqual(étroite.autres, [], 'échec pour une autre raison que la file pleine (borne 2)');
  assert.deepEqual(large.autres, [], 'échec pour une autre raison que la file pleine (borne 6)');
  // Rien n'est perdu : chaque demande est servie ou refusée, jamais oubliée.
  assert.equal(étroite.servis + étroite.refusés, 8, 'demandes perdues avec la borne 2 : ' + JSON.stringify(étroite));
  assert.equal(large.servis + large.refusés, 8, 'demandes perdues avec la borne 6 : ' + JSON.stringify(large));
  assert.ok(étroite.refusés > 0, 'aucun refus avec une file de 2 pour 8 demandes simultanées');
  assert.ok(large.servis > étroite.servis,
    'la borne de la file ne change rien au nombre de documents servis (' + étroite.servis + ' avec 2, ' + large.servis + ' avec 6)' +
    ' : ce ne sont donc pas elle qui refuse');
});

test('18e audit : la perte du fil ne concerne QUE le travail en cours, jamais la file', { timeout: 300000 }, async () => {
  // Trois travaux enfilés d'un coup, avec un délai de réponse de 60 ms : le premier expire (le fil est tué et le
  // travail repart en repli), les deux suivants doivent être menés à bien par le fil SUIVANT. Avant le 18e audit,
  // la mort du fil rejetait tous les travaux en vol d'un coup — 1 expiration pour 69 replis, mesuré.
  const chemin = path.join(ROOT, 'lib', 'pdf-service.js');
  delete require.cache[require.resolve(chemin)];
  process.env.PDF_REPONSE_MAX_MS = '60';
  const S = require(chemin);
  delete process.env.PDF_REPONSE_MAX_MS;
  try {
    const travail = { trip: maxTripPayload('dz'), title: 'essai', lang: 'dz', glyphMax: 6000 };
    const r = await Promise.all([S.build(travail), S.build(travail), S.build(travail)]);
    // AUCUN travail ne doit être REJETÉ : c'est la garantie. Avant le 18e audit, la perte du fil rejetait d'un
    // coup tous les travaux en vol — Promise.all aurait échoué ici au lieu de rendre trois documents. Que le
    // travail reparte dans le fil suivant ou en repli importe peu : ce qui compte est qu'il ne soit ni perdu ni
    // déversé en masse, et que les mises en page restent sérialisées.
    assert.equal(r.length, 3);
    r.forEach((x, i) => assert.ok(x.pdf && x.pdf.length > 50000, 'travail ' + i + ' sans document (' + x.source + ')'));
    // Chacun a coûté du temps, et ce temps est rendu : c'est lui qui est imputé au quota de l'adresse.
    r.forEach((x, i) => assert.ok(x.ms > 0, 'travail ' + i + ' : temps de calcul non rapporté'));
  } finally {
    await S.stop();
    delete require.cache[require.resolve(chemin)];
  }
});

test('19e audit : un fil perdu ne déverse pas la file dans le processus principal', { timeout: 300000 }, async () => {
  // Le 18e audit promettait que « la mort ou l'expiration du fil ne concerne QUE le travail en cours ». C'était faux :
  // dernierÉchec interdit de relancer un fil pendant REDEMARRAGE_MS (5 s), et défiler() retombait alors sur le repli
  // — mise en page SYNCHRONE — pour chaque travail de la file. Mesuré au 19e audit : cinq replis d'affilée, page
  // d'accueil servie en 3 101 ms au lieu de 13 ms.
  // Le test ne compte pas les replis (avec un délai de réponse de 60 ms, TOUT travail envoyé au fil expire, donc
  // chacun finit forcément en repli) : il mesure leur ESPACEMENT. Déversés, ils s'enchaînent sans respirer ; corrigés,
  // la file attend la fin du délai de garde puis le démarrage du fil suivant, soit plusieurs secondes entre deux.
  const chemin = path.join(ROOT, 'lib', 'pdf-service.js');
  delete require.cache[require.resolve(chemin)];
  process.env.PDF_REPONSE_MAX_MS = '60';
  // 5 s en production ; raccourci ici, avec un voyage COURT en repli : le déversement ne se produit que si la mise
  // en page tient dans le délai de garde, donc les deux doivent être réduits ensemble pour rester reproductible.
  process.env.PDF_REDEMARRAGE_MS = '1500';
  const S = require(chemin);
  delete process.env.PDF_REPONSE_MAX_MS;
  delete process.env.PDF_REDEMARRAGE_MS;
  try {
    // Voyage court : la mise en page en repli dure ~100 ms, bien en deçà du délai de garde raccourci.
    const complet = maxTripPayload('dz');
    const trip = Object.assign({}, complet, { legs: complet.legs.slice(0, 1) });
    const travail = { trip: trip, title: 'essai', lang: 'dz', glyphMax: 6000 };
    const t0 = Date.now();
    const finis = await Promise.all([0, 1, 2].map(() => S.build(travail).then(r => ({ r, t: Date.now() - t0 }))));
    const locaux = finis.filter(x => x.r.source === 'local').map(x => x.t).sort((a, b) => a - b);
    assert.ok(locaux.length >= 2, 'ce test suppose au moins deux replis (obtenus : ' + finis.map(x => x.r.source).join(', ') + ')');
    const écarts = locaux.slice(1).map((t, i) => t - locaux[i]);
    const minimum = Math.min(...écarts);
    assert.ok(minimum >= 700,
      'deux replis à ' + minimum + ' ms d\'intervalle : la file se déverse dans le processus principal au lieu' +
      ' d\'attendre le fil suivant (écarts ' + écarts.join(', ') + ' ms)');
    finis.forEach((x, i) => assert.ok(x.r.pdf && x.r.pdf.length > 5000, 'travail ' + i + ' sans document'));
  } finally {
    await S.stop();
    delete require.cache[require.resolve(chemin)];
  }
});

test('19e audit : l\'attente d\'un fil perdu n\'est pas facturée au budget de calcul du site', { timeout: 300000 }, async () => {
  // `ms` est ce que l'export a coûté à l'adresse demandeuse, `msProcessus` ce qu'il a coûté au PROCESSUS — la seule
  // part qui a bloqué la boucle d'événements et qui doit peser sur le budget global. Le 18e audit imputait les deux
  // fois le total, attente comprise : un fil qui ne répond plus retirait jusqu'à 15 s des 25 s par minute du site.
  const chemin = path.join(ROOT, 'lib', 'pdf-service.js');
  delete require.cache[require.resolve(chemin)];
  process.env.PDF_REPONSE_MAX_MS = '60';
  const S = require(chemin);
  delete process.env.PDF_REPONSE_MAX_MS;
  try {
    const r = await S.build({ trip: maxTripPayload('dz'), title: 'essai', lang: 'dz', glyphMax: 6000 });
    assert.equal(r.source, 'local', 'ce test suppose un repli');
    assert.ok(r.msProcessus > 0, 'le repli bloque le processus : msProcessus doit être compté');
    assert.ok(r.ms >= r.msProcessus, 'le total imputé à l\'adresse doit inclure le temps du processus');
    // Le temps de fil imputable est borné (FIL_CALCUL_MAX_MS = 3,5 s) : au-delà le fil ne calculait plus.
    assert.ok(r.ms - r.msProcessus <= 3500, 'temps de fil imputé non borné : ' + (r.ms - r.msProcessus) + ' ms');
  } finally {
    await S.stop();
    delete require.cache[require.resolve(chemin)];
  }
});

test('18e audit : le PDF écrit les écritures de droite à gauche dans le bon ordre VISUEL', () => {
  // Trou trouvé au 18e audit : neutraliser la remise en ordre visuelle de lib/pdf-text.js (visualOrder) ne faisait
  // échouer AUCUN des tests du PDF — tout l'arabe, l'hébreu, le persan et le divehi seraient sortis à l'envers dans
  // un document par ailleurs « complet, signé, sans glyphe manquant ». Tous les contrôles portaient sur la PRÉSENCE
  // du texte, jamais sur sa place.
  // L'oracle n'est pas une capture du rendu actuel (qui figerait le défaut s'il existait) mais bidi-js, une
  // implémentation INDÉPENDANTE de la règle L2 d'UAX #9 : on compare la ligne rendue par le moteur de mise en page
  // à la chaîne réordonnée par la bibliothèque.
  const PdfText = require(path.join(ROOT, 'lib', 'pdf-text.js'));
  const PDFDocument = require(path.join(ROOT, 'node_modules', 'pdfkit'));
  const bidi = require('bidi-js')();
  const doc = new PDFDocument({ size: 'A4' });
  doc.on('data', () => {});
  PdfText.registerFonts(doc);
  // Des lignes courtes (pas de coupure) mêlant écriture de droite à gauche, latin et chiffres — exactement ce que
  // produit un export : « ~ 3 h 45 de route · 309 km », « Étape 3 — Lyon », un nom latin au milieu d'une phrase.
  const cas = [
    ['ar', 'من باريس إلى ليون'],
    ['ar', 'محطة غامضة: Bavans'],
    ['ar', '309 كم'],
    ['ar', 'العودة إلى Lyon'],
    ['he', 'תחנה מסתורית: Lyon'],
    ['fa', 'از تهران تا کاشان'],
    ['dv', 'ދަތުރު Lyon'],
    ['fr', 'Étape 3 — Lyon, 465 km']
  ];
  const bad = [];
  for(const [lang, texte] of cas){
    const rendu = PdfText._visualLines(doc, texte, { width: 480, size: 10, lang: lang });
    const attendu = bidi.getReorderedString(texte, bidi.getEmbeddingLevels(texte, PdfText.isRtlLang(lang) ? 'rtl' : 'ltr'));
    if(rendu.length !== 1){ bad.push(lang + ' ' + JSON.stringify(texte) + ' : ' + rendu.length + ' lignes au lieu d\'une'); continue; }
    if(rendu[0] !== attendu) bad.push(lang + ' ' + JSON.stringify(texte) + '\n      rendu   ' + JSON.stringify(rendu[0]) + '\n      attendu ' + JSON.stringify(attendu));
  }
  doc.end();
  assert.deepEqual(bad, []);
  // Témoin : sur une écriture de gauche à droite, l'ordre visuel est l'ordre logique — si le contrôle ci-dessus
  // passait en rendant toujours le texte tel quel, celui-ci ne prouverait rien, d'où les cas RTL qui précèdent.
  const latin = PdfText._visualLines(doc, 'Lyon 69001', { width: 480, size: 10, lang: 'fr' });
  assert.deepEqual(latin, ['Lyon 69001']);
});

test('18e audit : le PDF RÉELLEMENT dessiné place les segments dans l\'ordre visuel', () => {
  // Le contrôle précédent porte sur _visualLines ; celui-ci porte sur drawText, c'est-à-dire sur ce qui est
  // vraiment écrit dans le document — les deux fonctions remettent les segments en ordre chacune de leur côté, une
  // seule mutation ne casserait donc que l'une des deux. On lit le flux de contenu du PDF : les segments y
  // apparaissent dans l'ordre où ils ont été dessinés, donc dans l'ordre VISUEL.
  // L'égalité stricte avec la chaîne réordonnée n'est pas exploitable (la mise en forme arabe fusionne et
  // décompose des lettres, « إ » se relit « ا ») : on vérifie donc ce qui distingue sans ambiguïté les deux ordres
  // — par quel mot la ligne COMMENCE, et de quel côté tombe le segment latin.
  const PdfText = require(path.join(ROOT, 'lib', 'pdf-text.js'));
  const PDFDocument = require(path.join(ROOT, 'node_modules', 'pdfkit'));
  const texte = 'من باريس إلى Lyon 465 كم'; // « de Paris à Lyon, 465 km »
  const doc = new PDFDocument({ size: 'A4', compress: false });
  const morceaux = [];
  doc.on('data', c => morceaux.push(c));
  PdfText.registerFonts(doc);
  PdfText.drawText(doc, texte, { x: 50, y: 60, width: 480, lang: 'ar', size: 10 });
  doc.end();
  return new Promise(resolve => doc.on('end', () => {
    const dessiné = pdfText(Buffer.concat(morceaux)).replace(/\s+/g, '');
    // En ordre visuel, la ligne commence par le DERNIER mot logique (« كم », rendu « مك ») ; en ordre logique elle
    // commencerait par « من ». Les deux premiers caractères suffisent à trancher.
    assert.ok(dessiné.startsWith('مك'), 'la ligne arabe ne commence pas par son dernier mot logique : ' + JSON.stringify(dessiné.slice(0, 12)));
    const iLatin = dessiné.indexOf('Lyon');
    assert.ok(iLatin > 0, 'segment latin absent du document : ' + JSON.stringify(dessiné.slice(0, 40)));
    // Et il tombe APRÈS « مك » : deux caractères arabes seulement le précèdent.
    assert.equal(iLatin, 2, 'le segment latin n\'est pas à sa place visuelle (indice ' + iLatin + ' dans ' + JSON.stringify(dessiné) + ')');
    resolve();
  }));
});

test('17e audit : mise en forme mémorisée — chaque appel reçoit une copie, le rendu ne bouge pas', () => {
  // memoiseLayout (lib/pdf-text.js) garde le résultat de la mise en forme OpenType d'un texte. Or pdfkit MODIFIE ce
  // résultat : layoutRun multiplie chaque position par l'échelle du document (1000 / unitsPerEm) et ajoute à chacune
  // un champ advanceWidth. Rendre deux fois le MÊME objet le ferait donc mettre à l'échelle deux fois.
  // Aujourd'hui le dégât est dormant : les 24 polices embarquées ont toutes unitsPerEm = 1000, donc une échelle de 1,
  // et multiplier deux fois par 1 ne change rien — un contrôle qui comparerait deux PDF ne verrait RIEN. Il suffirait
  // d'ajouter une police en 2048 unités (la valeur la plus courante pour une TrueType) pour que chaque texte déjà mis
  // en forme sorte au double de son espacement. Le contrôle porte donc sur le contrat lui-même : un appelant qui
  // modifie ce qu'il reçoit ne doit pas abîmer l'appelant suivant.
  const PdfText = require(path.join(ROOT, 'lib', 'pdf-text.js'));
  const police = PdfText.loadFonts().find(f => f.name === 'NotoSerifTibetan').font; // écriture à mise en forme lourde
  const texte = 'བཀྲ་ཤིས་བདེ་ལེགས།';
  const a = police.layout(texte);
  assert.ok(a.positions.length > 1, 'texte non mis en forme (' + a.positions.length + ' positions)');
  const avant = a.positions.map(p => p.xAdvance);
  const largeurAvant = a.advanceWidth;
  // L'appelant (pdfkit) modifie ce qu'il a reçu : mise à l'échelle et champ ajouté.
  a.positions.forEach(p => { p.xAdvance *= 7; p.advanceWidth = 123; });
  const b = police.layout(texte);
  assert.notEqual(b, a, 'deux appels rendent le MÊME objet : le premier appelant abîme le second');
  assert.deepEqual(b.positions.map(p => p.xAdvance), avant, 'positions héritées de la modification du premier appelant');
  assert.ok(b.positions.every(p => p.advanceWidth === undefined), 'champ ajouté par le premier appelant encore présent');
  // La copie doit rester un vrai GlyphRun : advanceWidth et bbox sont des ACCESSEURS qui recalculent depuis les
  // positions (une copie en objet plat les figerait, et les largeurs mesurées deviendraient fausses après mise à
  // l'échelle par pdfkit).
  assert.equal(b.advanceWidth, largeurAvant);
  assert.equal(Object.getPrototypeOf(b), Object.getPrototypeOf(a), 'la copie a perdu le prototype de GlyphRun');
  b.positions.forEach(p => { p.xAdvance *= 3; });
  assert.equal(b.advanceWidth, largeurAvant * 3, 'advanceWidth ne suit plus les positions : ce n\'est plus un accesseur');
  // Les glyphes, eux, ne sont jamais modifiés par pdfkit (il n'y lit qu'id, advanceWidth et codePoints) : ils restent
  // partagés, et c'est voulu — les copier coûterait cher pour rien.
  assert.equal(b.glyphs[0], a.glyphs[0], 'glyphes copiés inutilement');
});

// Et le rendu complet ne bouge pas : mêmes opérateurs de position et de tracé au deuxième passage (cache chaud) qu'au
// premier. Ce contrôle-ci ne verrait pas la mise à l'échelle double décrite plus haut (échelle de 1), mais il attrape
// tout ce qui casserait le rendu autrement : glyphes réordonnés, positions perdues, texte vide.
test('17e audit : mise en forme mémorisée — le tracé du cache chaud est identique à celui du cache froid', () => {
  const PdfText = require(path.join(ROOT, 'lib', 'pdf-text.js'));
  const PDFDocument = require(path.join(ROOT, 'node_modules', 'pdfkit'));
  const cas = [['dz', 'བཀྲ་ཤིས་བདེ་ལེགས། ཐིམ་ཕུ།'], ['bn', 'ঢাকা থেকে চট্টগ্রাম ৩৫০ কিলোমিটার'], ['hi', 'दिल्ली से आगरा २३० किलोमीटर'],
    ['ar', 'من باريس إلى ليون ٤٦٥ كم'], ['fr', 'Étape 3 — Lyon, 465 km']];
  const trace = (lang, texte) => {
    const doc = new PDFDocument({ size: 'A4', compress: false });
    const morceaux = [];
    doc.on('data', c => morceaux.push(c));
    PdfText.registerFonts(doc);
    PdfText.drawText(doc, texte, { x: 50, y: 60, width: 480, lang: lang, size: 10 });
    doc.end();
    return new Promise(resolve => doc.on('end', () => {
      const brut = Buffer.concat(morceaux).toString('latin1');
      resolve((brut.match(/[-\d.]+ [-\d.]+ Td|<[0-9a-fA-F]*> Tj|\[[^\]]*\] TJ/g) || []).join('|'));
    }));
  };
  return (async () => {
    const bad = [];
    for(const [lang, texte] of cas){
      const premier = await trace(lang, texte);
      const second = await trace(lang, texte);
      const troisieme = await trace(lang, texte);
      assert.ok(premier.length > 20, lang + ' : rien de dessiné');
      if(second !== premier || troisieme !== premier) bad.push(lang + ' : tracé différent au 2e ou 3e passage');
      const w = [1, 2].map(() => { const d = new PDFDocument({ size: 'A4' }); d.on('data', () => {}); PdfText.registerFonts(d);
        const x = PdfText.textWidth(d, texte, { size: 10, lang: lang }); d.end(); return x; });
      if(Math.abs(w[0] - w[1]) > 1e-9) bad.push(lang + ' : largeur ' + w[0] + ' puis ' + w[1]);
    }
    assert.deepEqual(bad, []);
  })();
});

test('17e audit, point 2 : corps d\'export — le voyage maximal passe, au-delà de la limite un message propre', { timeout: 180000 }, async () => {
  const bad = [];
  // Le pire cas mesuré (~118 ko, dzongkha) doit passer : c'est tout l'objet de la nouvelle limite.
  const worst = JSON.stringify(maxTripPayload('dz'));
  assert.ok(Buffer.byteLength(worst) > 100000, 'charge utile maximale trop petite : ' + Buffer.byteLength(worst) + ' o');
  const ok = await H.postPatient('/api/export-pdf', worst, { timeout: 120000 });
  if(ok.status !== 200) bad.push('voyage maximal (' + Buffer.byteLength(worst) + ' o) -> ' + ok.status + ' ' + ok.body.toString('utf8').slice(0, 90));
  // Au-delà de la limite : 413 avec un message PROPRE À LA CAUSE, que le client peut afficher (« itinéraire trop
  // volumineux ») au lieu du « bad request » générique, qui devenait un « réessayez » sans effet.
  await sleep(1000);
  const tooBig = await H.postPatient('/api/export-pdf', JSON.stringify({ lang: 'fr', legs: [{ label: 'x'.repeat(300000) }] }), { timeout: 60000 });
  if(tooBig.status !== 413) bad.push('300 ko -> ' + tooBig.status);
  else {
    let j = null;
    try { j = JSON.parse(tooBig.body.toString('utf8')); } catch(e){}
    if(!j || j.error !== 'trip too large') bad.push('413 sans message propre : ' + tooBig.body.toString('utf8').slice(0, 120));
  }
  assert.deepEqual(bad, []);
});

test('17e audit, point 3 : caractères distincts d\'un vrai voyage loin de la limite (birman, tamoul, dzongkha, coréen)', { timeout: 120000 }, () => {
  const F = serverFns(['distinctChars'], ['PDF_MAX_DISTINCT_CHARS']);
  const counts = {};
  for(const lang of ['my', 'ta', 'dz', 'ko', 'ja', 'zh', 'zh-Hant']){
    counts[lang] = F.distinctChars(maxTripPayload(lang), new Set(), F.PDF_MAX_DISTINCT_CHARS, 0).size;
  }
  const over = Object.entries(counts).filter(([, n]) => n >= F.PDF_MAX_DISTINCT_CHARS / 2);
  assert.deepEqual(over, [], 'trop près de PDF_MAX_DISTINCT_CHARS (' + F.PDF_MAX_DISTINCT_CHARS + ') : ' + JSON.stringify(counts));
  assert.ok(counts.my > 40 && counts.ja > 100, 'comptage inopérant : ' + JSON.stringify(counts));
});

test('17e audit, point 4 : hors de France, deux graphies de région = deux articles Wikipédia, deux entrées de cache', { timeout: 180000 }, async () => {
  // Wikipédia ne canonise QUE la première lettre d'un titre : « Ville17 (illinois) » et « Ville17 (Illinois) » sont
  // deux articles différents. La clé de cache mettait la région en capitale initiale : une seule entrée pour les deux,
  // et le résultat VIDE de l'une était resservi à l'autre pendant 24 h.
  const q = dept => '/api/photo?name=Ville17&dept=' + encodeURIComponent(dept) + '&country=US&lang=fr&lat=45.76&lon=4.83';
  srv.setMock({ wiki: 'status:404' });
  const empty = await H.get(q('illinois'), { ip: freshIp(), timeout: 30000 });
  assert.equal(empty.status, 200);
  assert.equal(JSON.parse(empty.body.toString('utf8')).image, null, 'le témoin « illinois » devait rester sans photo');
  srv.setMock({});
  await sleep(300);

  const t0 = Date.now();
  const r = await H.get(q('Illinois'), { ip: freshIp(), timeout: 30000 });
  await sleep(300);
  const j = JSON.parse(r.body.toString('utf8'));
  const titles = srv.outbound(t0, 'wiki').map(c => { try { return decodeURIComponent(c.url); } catch(e){ return c.url; } });
  assert.ok(j.image, '« Illinois » a reçu le résultat vide mis en cache pour « illinois » : ' + JSON.stringify(j));
  assert.ok(titles.some(u => u.includes('Ville17 (Illinois)')), 'la région n\'est pas partie telle quelle vers Wikipédia : ' + JSON.stringify(titles));
  assert.ok(!titles.some(u => u.includes('Ville17 (illinois)')), 'graphie confondue : ' + JSON.stringify(titles));

  // Canonisation française conservée : « 2a » et « 2A » désignent le même département, donc une seule entrée.
  const fr = c => '/api/photo?name=Cargese17&dept=' + c + '&country=FR&lang=fr&lat=41.99&lon=8.59';
  const t1 = Date.now();
  const a = await H.get(fr('2A'), { ip: freshIp(), timeout: 30000 });
  await sleep(300);
  assert.ok(srv.outbound(t1, 'wiki').some(c => decodeURIComponent(c.url).includes('Cargese17 (Corse-du-Sud)')), 'désambiguïsation corse absente');
  const t2 = Date.now();
  const b = await H.get(fr('2a'), { ip: freshIp(), timeout: 30000 });
  await sleep(300);
  assert.equal(JSON.parse(b.body.toString('utf8')).image, JSON.parse(a.body.toString('utf8')).image);
  assert.deepEqual(srv.outbound(t2, 'wiki'), [], '« 2a » n\'a pas réutilisé l\'entrée de « 2A »');
});

test('17e audit, point 5 : cache des randonnées — seules les étiquettes relues sont gardées, plafond propre au cache', () => {
  const F = serverFns(['pickHikeTags', 'cacheSet'], ['HIKE_TAG_RE', 'HIKE_TAG_MAX_LEN', 'CACHE_MAX_ENTRIES', 'OSM_HIKE_CACHE_MAX']);
  const tags = { name: 'Sentier', 'name:de': 'Weg', 'name:fr': 'Sentier', distance: '12.5', network: 'lwn',
    sac_scale: 'mountain_hiking', 'osmc:symbol': 'red:red:white_bar', ref: 'E5', website: 'https://example.org/x',
    description: 'd'.repeat(400), operator: 'DAV', wikidata: 'Q42', 'name:de:long': 'x' };
  assert.deepEqual(Object.keys(F.pickHikeTags(tags)).sort(), ['distance', 'name', 'name:de', 'name:fr', 'network']);
  // Valeurs raccourcies : plus de 300 caractères gardés par étiquette.
  assert.equal(F.pickHikeTags({ name: 'n'.repeat(500) }).name.length, F.HIKE_TAG_MAX_LEN);
  assert.ok(F.HIKE_TAG_MAX_LEN <= 150, 'HIKE_TAG_MAX_LEN = ' + F.HIKE_TAG_MAX_LEN);
  // Poids d'une entrée (60 relations) avant/après, sur la sérialisation : le gain vient surtout de `description`,
  // gardée 14 jours sans jamais être relue.
  const size = pick => require('v8').serialize(Array.from({ length: 60 }, () => ({ id: 1, tags: pick(Object.assign({}, tags)), lat: 1, lon: 2 }))).length;
  const old = t2 => { const o = {}; for(const k of Object.keys(t2)) if(/^(name(:[a-z]{2,3})?|distance|network|sac_scale|osmc:symbol|ref|website|description|operator)$/.test(k) && typeof t2[k] === 'string') o[k] = t2[k].slice(0, 300); return o; };
  assert.ok(size(F.pickHikeTags) * 3 < size(old), 'entrée réduite de moins des deux tiers : ' + size(F.pickHikeTags) + ' o contre ' + size(old) + ' o');
  // Plafond PROPRE : cacheSet accepte une limite par cache, plus basse que le plafond commun.
  assert.ok(F.OSM_HIKE_CACHE_MAX >= 300 && F.OSM_HIKE_CACHE_MAX <= 500, 'OSM_HIKE_CACHE_MAX = ' + F.OSM_HIKE_CACHE_MAX);
  assert.ok(F.OSM_HIKE_CACHE_MAX < F.CACHE_MAX_ENTRIES);
  const m = new Map();
  for(let i = 0; i < F.OSM_HIKE_CACHE_MAX + 50; i++) F.cacheSet(m, 'k' + i, i, F.OSM_HIKE_CACHE_MAX);
  assert.equal(m.size, F.OSM_HIKE_CACHE_MAX, 'plafond propre ignoré : ' + m.size + ' entrées');
  assert.equal(m.has('k0'), false, 'la plus ancienne entrée n\'a pas été retirée');
  // Sans limite explicite, le plafond commun s'applique toujours (aucune régression pour les autres caches).
  const m2 = new Map();
  for(let i = 0; i < 5; i++) F.cacheSet(m2, 'k' + i, i);
  assert.equal(m2.size, 5);
});

test('17e audit, point 6 : titre d\'espace de noms précédé d\'un souligné refusé, sans appel sortant', { timeout: 120000 }, async () => {
  const F = serverFns(['isNamespaceTitle']);
  const refused = ['_File:X.jpg', '__Fichier:X.jpg', '_ Category:Foo', '_Utilisateur:Bob', '  _Special:Search', '_:_File:X.jpg'];
  assert.deepEqual(refused.filter(n => !F.isNamespaceTitle(n)), [], 'souligné initial : contrôle contourné');
  // Témoins : un vrai nom de lieu n'est pas refusé, y compris avec un souligné (Wikipédia y voit une espace).
  assert.deepEqual(['Lyon', 'Saint-Étienne', 'Bourg_en_Bresse', '_Lyon', 'Aix-en-Provence'].filter(n => F.isNamespaceTitle(n)), []);
  // Bout en bout : aucun appel sortant pour ces titres.
  srv.setMock({});
  const bad = [];
  for(const n of refused){
    const t0 = Date.now();
    const r = await H.get('/api/photo?name=' + encodeURIComponent(n) + '&lang=fr&lat=45.76&lon=4.83', { ip: freshIp(), timeout: 30000 });
    let j = null;
    try { j = JSON.parse(r.body.toString('utf8')); } catch(e){}
    if(r.status !== 200 || !j || j.image || j.wikiUrl) bad.push(n + ' -> ' + r.status + ' ' + r.body.toString('utf8').slice(0, 80));
    await sleep(250);
    const calls = srv.outbound(t0);
    if(calls.length) bad.push(JSON.stringify(n) + ' : ' + calls.length + ' appel(s) sortant(s), ex. ' + calls[0].url);
  }
  assert.deepEqual(bad, []);
});

test('19e audit : une page tierce ne peut pas épuiser le quota des gros fichiers d\'un visiteur', { timeout: 120000 }, async () => {
  // Le contrôle d'origine du 11e audit ne couvrait que /api/. Le quota des quatre gros fichiers (feuille de style et
  // trois scripts, 30 requêtes par minute et par adresse) n'en avait aucun : trente balises
  // « <img src="https://…/css/style.css?1"> » sur une page tierce faisaient répondre 429 à la feuille de style ET aux
  // trois scripts pendant une minute — l'accueil se chargeait encore, sans style ni code (19e audit du 21/09/2026).
  const ip = freshIp();
  // 1. Trente requêtes lancées depuis une page tierce : refusées, et sans rien consommer.
  const refus = [];
  for(let i = 0; i < 30; i++){
    const r = await H.get('/css/style.css?' + i, { ip: ip, headers: 'Sec-Fetch-Site: cross-site\r\n' });
    if(r.status !== 403) refus.push(i + ' -> ' + r.status);
  }
  assert.deepEqual(refus.slice(0, 5), [], 'une requête lancée depuis un autre site doit être refusée');
  // 2. Le visiteur, lui, charge toujours le site.
  for(const chemin of ['/css/style.css', '/js/app.js', '/js/i18n.js', '/js/trip-data.js']){
    const r = await H.get(chemin, { ip: ip, headers: 'Sec-Fetch-Site: same-origin\r\n' });
    assert.equal(r.status, 200, chemin + ' refusé au visiteur après la rafale tierce : son quota a bien été consommé');
  }
});

test('17e audit, point 7 : Sec-Fetch-Site comparé sans tenir compte de la casse', { timeout: 60000 }, async () => {
  const bad = [];
  for(const v of ['cross-site', 'Cross-Site', 'CROSS-SITE', 'cross-Site', ' cross-site ']){
    const r = await H.get('/api/status', { ip: freshIp(), headers: 'Sec-Fetch-Site: ' + v + '\r\n' });
    if(r.status !== 403) bad.push(JSON.stringify(v) + ' -> ' + r.status);
  }
  // Témoins : les autres valeurs (et l'absence d'en-tête) passent toujours.
  for(const v of ['same-origin', 'same-site', 'none']){
    const r = await H.get('/api/status', { ip: freshIp(), headers: 'Sec-Fetch-Site: ' + v + '\r\n' });
    if(r.status !== 200) bad.push(JSON.stringify(v) + ' -> ' + r.status);
  }
  const plain = await H.get('/api/status', { ip: freshIp() });
  if(plain.status !== 200) bad.push('sans en-tête -> ' + plain.status);
  assert.deepEqual(bad, []);
});

test('17e audit, point 8 : /api/photo sans lat/lon -> réponse vide immédiate, aucun appel sortant', { timeout: 120000 }, async () => {
  // Sans point de référence, wikiPlaceMatches écarte tout article : la réponse était vide de toute façon, après
  // plusieurs appels à Wikipédia/Wikidata/Commons, et ce vide occupait une entrée de cache 24 h.
  srv.setMock({});
  const bad = [];
  for(const qs of ['name=Lyon17a&lang=fr', 'name=Lyon17b&lang=fr&dept=69&country=FR', 'name=Lyon17c&lang=fr&lat=abc&lon=4.83',
    'name=Lyon17d&lang=fr&lat=91&lon=4.83', 'name=Lyon17e&lang=fr&lon=4.83']){
    const t0 = Date.now();
    const r = await H.get('/api/photo?' + qs, { ip: freshIp(), timeout: 30000 });
    let j = null;
    try { j = JSON.parse(r.body.toString('utf8')); } catch(e){}
    if(r.status !== 200 || !j) bad.push(qs + ' -> ' + r.status);
    else if(j.image || j.wikiUrl || j.title) bad.push(qs + ' -> ' + JSON.stringify(j).slice(0, 120));
    await sleep(250);
    const calls = srv.outbound(t0);
    if(calls.length) bad.push(qs + ' : ' + calls.length + ' appel(s) sortant(s), ex. ' + calls[0].url);
  }
  // Témoin : avec des coordonnées, les appels ont bien lieu.
  const t1 = Date.now();
  const ok = await H.get('/api/photo?name=Lyon17f&lang=fr&lat=45.76&lon=4.83', { ip: freshIp(), timeout: 30000 });
  assert.equal(ok.status, 200);
  await sleep(300);
  if(!srv.outbound(t1, 'wiki').length) bad.push('aucun appel Wikipédia avec des coordonnées');
  assert.deepEqual(bad, []);
});

test('17e audit, point 9 : borne de distance d\'étape contrôlée sur la valeur AFFICHÉE (99 999,6 -> jamais « 100000 km »)', { timeout: 120000 }, async () => {
  const legs = [
    { label: 'Jour 1', stop: 'A', distanceKm: 99999.6, travelTime: '2h' },                    // arrondi à 100000
    { label: 'Jour 2', stop: 'B', distanceKm: 99999.5, travelTime: '3h' },                    // arrondi à 100000
    { label: 'Jour 3', stop: 'C', distanceKm: 40, travelTime: '4h', roadKm: 99999.7, roadTime: '1h',
      ferryInfo: { route: 'X - Y', amount: 12 } },                                            // partie routière idem
    { label: 'Jour 4', stop: 'D', distanceKm: 99998.4, travelTime: '5h' },                    // témoin : 99998 km
    { label: 'Retour', stop: 'Lyon', isReturn: true }
  ];
  await sleep(1500);
  const r = await H.postPatient('/api/export-pdf', { lang: 'fr', city: 'Lyon', legs });
  assert.equal(r.status, 200);
  assert.ok(isCompletePdf(r.body), 'PDF incomplet');
  const txt = pdfText(r.body).replace(/\s+/g, ' ');
  const bad = [];
  if(!txt.includes('OpenStreetMap') || !txt.includes('Open Charge Map')) bad.push('pied de page absent');
  if(/100000\s*km/.test(txt)) bad.push('« 100000 km » écrit');
  if(!txt.includes('· 99998 km')) bad.push('témoin « 99998 km » absent');
  // Durées toujours écrites, sans séparateur orphelin.
  for(const w of ['~ 2h de route', '~ 3h de route', '~ 4h de traversée', '~ 5h de route · 99998 km']) if(!txt.includes(w)) bad.push('témoin absent : « ' + w + ' »');
  if(/de (route|traversée)\s*·\s*(·|$|~)/.test(txt)) bad.push('séparateur « · » sans distance');
  if(/1h de route/.test(txt)) bad.push('partie routière hors bornes conservée');
  assert.deepEqual(bad, [], txt.slice(0, 900));
});

test('17e audit, point 10 : nom de fichier sans marque bidi invisible ni flèche inversée', { timeout: 120000 }, async () => {
  // tripLabelText (app.js) isole chaque nom propre par FSI…PDI et, en écriture de droite à gauche, écrit « ← ».
  // Ces caractères sont invisibles (ou à l'envers) dans un nom de fichier, qui se lit toujours de gauche à droite :
  // encodés en RFC 5987 ils donnaient « %E2%81%A8 » au milieu du nom téléchargé.
  const FSI = chr(0x2068), PDI = chr(0x2069), LRM = chr(0x200E), RLM = chr(0x200F), RLE = chr(0x202B), PDF_ = chr(0x202C);
  const label = FSI + 'Lyon17j' + PDI + ' ' + chr(0x2190) + ' ' + FSI + 'Bled17j' + PDI + ' · ' + LRM + RLM + RLE + '2026' + PDF_;
  await sleep(1500);
  const r = await H.postPatient('/api/export-pdf', { lang: 'ar', city: 'Lyon17j', tripLabel: label,
    legs: [{ label: 'Jour 1', stop: 'Bled17j' }, { label: 'Retour', stop: 'Lyon17j', isReturn: true }] });
  assert.equal(r.status, 200);
  assert.ok(isCompletePdf(r.body), 'PDF incomplet');
  const cd = r.headers['content-disposition'] || '';
  assert.match(cd, /attachment/);
  const star = /filename\*=UTF-8''([^;]+)/.exec(cd);
  assert.ok(star, 'filename* absent : ' + cd);
  let decoded;
  try { decoded = decodeURIComponent(star[1]); } catch(e){ decoded = 'INDÉCODABLE ' + e.message; }
  const bad = [];
  // Ni dans la partie ASCII, ni dans la partie encodée, ni une fois décodée.
  for(const [name, s] of [['en-tête brut', cd], ['filename* décodé', decoded]]){
    if(/[⁦-⁩‪-‮‎‏؜]/.test(s)) bad.push(name + ' : marque bidi invisible — ' + JSON.stringify(s));
    if(s.includes(chr(0x2190))) bad.push(name + ' : flèche « ← » — ' + JSON.stringify(s));
  }
  if(/%E2%81%A[89]|%E2%80%8[EF]|%E2%80%A[ABCDE]|%E2%86%90/i.test(star[1])) bad.push('filename* encodé : ' + star[1]);
  // Le libellé reste lisible et la flèche est remise dans le sens du nom de fichier.
  if(!decoded.includes('Lyon17j') || !decoded.includes('Bled17j')) bad.push('libellé perdu : ' + decoded);
  if(!decoded.includes(chr(0x2192))) bad.push('flèche « → » absente : ' + decoded);
  if(!decoded.endsWith('.pdf')) bad.push('extension absente : ' + decoded);
  assert.deepEqual(bad, []);
});

test('18e audit : un corps trop gros dit lequel — « itinéraire » pour l\'export, pas pour la recherche', async () => {
  // Le gestionnaire d'erreurs répondait « trip too large » à TOUT corps trop volumineux : une recherche de ville de
  // 3 ko recevait « itinéraire trop volumineux », qui ne veut rien dire. Le client n'affiche le message tel quel que
  // pour l'export (export.tooLarge, traduit dans les 161 langues).
  const gros = JSON.stringify({ q: 'Lyon', x: 'a'.repeat(4000) });
  const r = await H.post('/api/search-city', gros);
  assert.equal(r.status, 413);
  assert.equal(JSON.parse(r.body.toString('utf8')).error, 'request too large');
  const pdf = await H.post('/api/export-pdf', JSON.stringify({ legs: [], x: 'a'.repeat(300000) }));
  assert.equal(pdf.status, 413);
  assert.equal(JSON.parse(pdf.body.toString('utf8')).error, 'trip too large');
});
