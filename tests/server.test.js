// Serveur réel (server.js) démarré sur un port libre, avec un fetch simulé (aucun service tiers sollicité, jamais la
// production). Durée : ~1 min de démarrage (moteur, polices du PDF, précompression ; 2 à 5 min de plus si
// server.js reconstruit son index de recherche dans cache/) + ~1 min de tests.
// Le serveur est arrêté à la fin, même en cas d'échec (after + arrêt à la sortie du processus).
// Journal du serveur : dossier temporaire des tests (voir la première ligne de diagnostic).
'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { startServer } = require('./helpers/server.js');
const { client, freshIp, missingSecurityHeaders } = require('./helpers/http.js');
const { pdfText, pageCount, isCompletePdf } = require('./helpers/pdf-text.js');

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
  const cases = [['{bad', 400], ['null', 400], ['[]', 400], ['{"legs":[]}', 400], [JSON.stringify({ legs: Array(26).fill({ label: 'a' }) }), 400],
    [JSON.stringify({ legs: [{ label: 'x'.repeat(40000) }] }), 413]];
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
