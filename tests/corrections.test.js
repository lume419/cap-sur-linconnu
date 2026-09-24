// TESTS DE NON-RÉGRESSION DES TABLES DE CORRECTION (24/09/2026).
//
// Pourquoi ce fichier existe. Une seule des tables de scripts/communes-corrections.js était gardée : NAME_FIXES et
// JUNK_IDS, par deux tests de data.test.js. Les autres — codes postaux démentis par les coordonnées, étiquettes de
// région démenties par la carte, fiche en double posée sur la mauvaise île — pouvaient être VIDÉES, ou leur effet
// défait par une régénération, sans qu'aucun test ne bronche. Chacune a coûté une enquête : un crible, puis un
// contrôle fiche par fiche sur la carte. Rien ne les retenait.
//
// Ce que ces tests ancrent, et où. Ils lisent la DONNÉE PUBLIÉE, pas la table : ils échouent aussi bien si la table
// est vidée que si le générateur cesse de l'appliquer. Ils vérifient en plus la table elle-même, dans les deux sens :
//   - aucune entrée MORTE (qui ne désigne plus aucune fiche) ni AMBIGUË (qui en désignerait deux) ;
//   - les fiches que le contrôle a INNOCENTÉES ne doivent PAS entrer dans les tables — sans quoi élargir une table
//     pour « finir le travail » casserait des données justes en silence.
//
// Les liaisons de ferry vérifiées ici sont celles dont le PRIX ou la DURÉE a été re-sourcé après avoir été déduit :
// un chiffre déduit qui ressemble à un chiffre publié ne se voit pas, et c'est précisément ce qui s'était produit.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'public', 'data');
const C = require(path.join(ROOT, 'scripts', 'communes-corrections.js'));
const TripData = require(path.join(ROOT, 'public', 'js', 'trip-data.js'));

// Fiches publiées d'un pays, chargées à la demande : ces tables ne touchent qu'une poignée de pays.
const fichesParPays = new Map();
function fichesDe(cc){
  if(!fichesParPays.has(cc)){
    const f = TripData.COUNTRIES[cc] && TripData.COUNTRIES[cc].file;
    const out = [];
    const p = f && path.join(DATA, f);
    if(p && fs.existsSync(p)){
      for(const l of fs.readFileSync(p, 'utf8').split('\n')){
        if(!l) continue;
        const ch = l.split(';'), ll = (ch[1] || '').split(',');
        out.push({ pop: +ch[0], lon: +ll[0], lat: +ll[1], cp: ch[2] || '', div: ch[3] || '', name: ch[4] || '' });
      }
    }
    fichesParPays.set(cc, out);
  }
  return fichesParPays.get(cc);
}

// Même critère que les fonctions de correction elles-mêmes : pays, nom, et dix-millième de degré (~11 m).
function fichesVisées(e){
  return fichesDe(e.cc).filter(f => f.name === e.name
    && Math.abs(f.lat - e.lat) < 1e-4 && Math.abs(f.lon - e.lon) < 1e-4);
}

// Chaque entrée doit désigner UNE fiche et une seule : ni morte, ni ambiguë.
function uneSeuleFiche(bad, table, e){
  const v = fichesVisées(e);
  const qui = table + ' : ' + e.cc + ' ' + JSON.stringify(e.name);
  if(v.length === 0){ bad.push(qui + ' ne désigne plus aucune fiche publiée (entrée morte, à retirer)'); return null; }
  if(v.length > 1){ bad.push(qui + ' désigne ' + v.length + ' fiches (entrée ambiguë, le critère ne suffit plus)'); return null; }
  return v[0];
}

test('corrections : les codes postaux démentis par les coordonnées sont publiés VIDES', () => {
  // Voir CP_CONTREDIT dans communes-corrections.js. Le code n'est pas lu dans une table : il est pris au POINT
  // POSTAL LE PLUS PROCHE à moins de 15 km, si bien qu'un point mal placé dans le fichier GeoNames contamine tout
  // ce qui l'entoure — Sarrebruck, 182 971 habitants, portait 50424, qui est Cologne. Le code démenti est EFFACÉ,
  // jamais remplacé : celui que rend la carte est celui du bourg voisin, l'écrire donnerait à un hameau le code
  // d'un autre lieu.
  assert.ok(C.CP_CONTREDIT.length >= 30, 'CP_CONTREDIT est tombée à ' + C.CP_CONTREDIT.length + ' entrées (30 au minimum)');
  const bad = [];
  for(const e of C.CP_CONTREDIT){
    const f = uneSeuleFiche(bad, 'CP_CONTREDIT', e);
    if(f && f.cp !== '') bad.push('CP_CONTREDIT : ' + e.cc + ' ' + JSON.stringify(e.name) + ' publié avec le code ' + f.cp + ', attendu VIDE');
    if(!C.cpContredit(e.cc, e.name, e.lat, e.lon)) bad.push('CP_CONTREDIT : cpContredit() ne reconnaît plus ' + e.cc + ' ' + JSON.stringify(e.name));
  }
  assert.deepEqual(bad, []);
});

// Fiches que le crible des codes postaux a SIGNALÉES et que la CARTE a INNOCENTÉES : leur code doit RESTER.
const CP_ÉPARGNÉS = [
  { cc: 'IT', name: 'Osidda', lat: 40.5237, lon: 9.2205, cp: '08020',
    pourquoi: 'enclave de la province de Nuoro en pays de Sassari : la carte confirme 08020' },
  { cc: 'DK', name: 'Tunø By', lat: 55.9488, lon: 10.4444, cp: '8799',
    pourquoi: 'île : ses voisins à 12 km sont sur une autre terre, la carte confirme 8799' },
  { cc: 'PL', name: 'Morawsko', lat: 49.9702, lon: 22.6975, cp: '35-514',
    pourquoi: 'la carte confirme 35-514' },
  { cc: 'ES', name: 'Campiña', lat: 38.219, lon: -2.9807, cp: '14600',
    pourquoi: 'CAS INVERSE : le code 14600 et l\'étiquette disent Cordoue, seules les COORDONNÉES disent Jaén, '
      + 'et 67 904 habitants sont le chiffre d\'une comarque. C\'est la POSITION qui est fausse ; effacer le code '
      + 'détruirait la donnée juste. Sa bonne position reste inconnue' }
];
test('corrections : les fiches innocentées par la carte gardent leur code postal', () => {
  const bad = [];
  for(const e of CP_ÉPARGNÉS){
    const f = uneSeuleFiche(bad, 'CP_ÉPARGNÉS', e);
    if(f && f.cp !== e.cp) bad.push('CP_ÉPARGNÉS : ' + e.cc + ' ' + JSON.stringify(e.name) + ' publié avec '
      + JSON.stringify(f.cp) + ', attendu ' + JSON.stringify(e.cp) + ' — ' + e.pourquoi);
    if(C.cpContredit(e.cc, e.name, e.lat, e.lon)) bad.push('CP_ÉPARGNÉS : ' + e.cc + ' ' + JSON.stringify(e.name)
      + ' est entré dans CP_CONTREDIT, alors que la carte le CONFIRME — ' + e.pourquoi);
  }
  assert.deepEqual(bad, []);
});

test('corrections : les étiquettes de région démenties par la carte sont celles du terrain', () => {
  // Voir DIVISION_FIXES : chaque étiquette a été confrontée au géocodage inverse, une par une, en comparant le
  // lieu à son VOISIN d'un kilomètre plutôt qu'à son étiquette — ce qui se passe de toute table de correspondance
  // entre rangs administratifs.
  assert.ok(C.DIVISION_FIXES.length >= 56, 'DIVISION_FIXES est tombée à ' + C.DIVISION_FIXES.length + ' entrées (56 au minimum)');
  const bad = [];
  for(const e of C.DIVISION_FIXES){
    const f = uneSeuleFiche(bad, 'DIVISION_FIXES', e);
    if(f && f.div !== e.to) bad.push('DIVISION_FIXES : ' + e.cc + ' ' + JSON.stringify(e.name) + ' publié en '
      + JSON.stringify(f.div) + ', attendu ' + JSON.stringify(e.to));
    if(C.fixDivision(e.cc, e.name, e.lat, e.lon) !== e.to) bad.push('DIVISION_FIXES : fixDivision() ne rend plus '
      + JSON.stringify(e.to) + ' pour ' + e.cc + ' ' + JSON.stringify(e.name));
  }
  assert.deepEqual(bad, []);
});

test('corrections : « Ponta Verde » (Cap-Vert) n\'est publiée qu\'une fois, et sur Fogo', () => {
  // Voir ADMIN_COORD_CONFLICT. Deux fiches portaient le concelho CV-18 (São Filipe, sur Fogo) : l'une sur Fogo,
  // cohérente ; l'autre SUR SANTIAGO, à 80 km de son propre concelho. La seconde faisait se chevaucher les boîtes
  // d'îles du Cap-Vert, et c'est elle qui est écartée.
  const v = fichesDe('CV').filter(f => f.name === 'Ponta Verde');
  assert.equal(v.length, 1, 'attendu une seule « Ponta Verde », trouvé ' + v.length + ' : ' + JSON.stringify(v));
  assert.ok(v[0].lat > 14.8 && v[0].lat < 15.1 && v[0].lon < -24.2 && v[0].lon > -24.8,
    '« Ponta Verde » publiée hors de Fogo : ' + v[0].lat + ',' + v[0].lon);
  assert.ok(C.isAdminCoordConflict('CV', 'Ponta Verde', 15.1992, -23.6),
    'isAdminCoordConflict() n\'écarte plus la fiche posée sur Santiago');
});

test('ferries : les cinq tronçons de l\'Apetahi Express gardent leur durée publiée et restent sans véhicules', () => {
  // Cinq tronçons d'un même navire, durées prises dans la grille de l'exploitant : aucune n'est estimée. Maupiti
  // est desservie par ce navire ; sa liaison n'a AUCUN tarif publié, d'où priceStatus « unknown » — un prix
  // inventé serait pire qu'un prix absent. Sa distance, 56 km, est mesurée entre les deux lieux publiés.
  const APETAHI = { 'huahine|tahiti': 3.5, 'huahine|raiatea': 1, 'raiatea|tahaa': 1, 'boraBora|tahaa': 1, 'boraBora|maupiti': 1 };
  const bad = [];
  for(const clé of Object.keys(APETAHI)){
    const r = TripData.FERRY_ROUTES[clé];
    if(!r){ bad.push(clé + ' : liaison absente'); continue; }
    if(r.durationH !== APETAHI[clé]) bad.push(clé + ' : durée ' + r.durationH + ' h, attendu ' + APETAHI[clé]);
    if(r.durationEstimated) bad.push(clé + ' : durée marquée ESTIMÉE alors que l\'exploitant la publie');
    if(!r.passengerOnly) bad.push(clé + ' : passengerOnly perdu — la grille de l\'Apetahi n\'a aucune ligne véhicule');
    for(const c of ['1', '2', '5']){
      if(r.priceByClass[c] !== null) bad.push(clé + ' : un prix véhicule est apparu en classe ' + c);
    }
  }
  const m = TripData.FERRY_ROUTES['boraBora|maupiti'];
  if(m){
    if(m.priceByClass.foot !== null) bad.push('boraBora|maupiti : un tarif piéton est apparu, aucun n\'est publié');
    if(m.priceStatus !== 'unknown') bad.push('boraBora|maupiti : priceStatus ' + JSON.stringify(m.priceStatus) + ', attendu « unknown »');
    if(m.distanceKm !== 56) bad.push('boraBora|maupiti : distance ' + m.distanceKm + ' km, attendu 56 entre les deux lieux publiés');
  }
  assert.deepEqual(bad, []);
});

test('ferries : les tarifs piétons du Wadden sont ceux publiés, non déduits', () => {
  // Ameland et Schiermonnikoog portaient un tarif piéton DÉDUIT — 10,58 € et 7,95 € — là où l'exploitant en publie
  // un, le même pour les deux : 9,54 €. Deux chiffres déduits qui ressemblaient à des chiffres publiés.
  const bad = [];
  for(const clé of ['continental|wadden-ameland', 'continental|wadden-schiermonnikoog']){
    const r = TripData.FERRY_ROUTES[clé];
    if(!r){ bad.push(clé + ' : liaison absente'); continue; }
    if(r.priceByClass.foot !== 9.54) bad.push(clé + ' : tarif piéton ' + r.priceByClass.foot + ' €, attendu 9,54 € (tarif publié)');
  }
  assert.deepEqual(bad, []);
});

test('corrections : les coordonnées corrigées d\'après l\'IGN sont celles publiées', () => {
  // Voir IGN_COORD_FIXES : treize positions d'outre-mer reprises du référentiel officiel, dont Maupiti, qui était
  // posée à 236 km de sa vraie place, et Arue. Une position fausse ne se voit pas dans une liste : elle se voit
  // dans une traversée qui devient absurde.
  assert.ok(Object.keys(C.IGN_COORD_FIXES).length >= 13,
    'IGN_COORD_FIXES est tombée à ' + Object.keys(C.IGN_COORD_FIXES).length + ' entrées (13 au minimum)');
  const bad = [];
  for(const clé of Object.keys(C.IGN_COORD_FIXES)){
    const e = C.IGN_COORD_FIXES[clé];
    const nom = clé.split('|')[0];
    const lat = e.lat !== undefined ? e.lat : e[1], lon = e.lon !== undefined ? e.lon : e[0];
    if(!(isFinite(lat) && isFinite(lon))){ bad.push('IGN_COORD_FIXES ' + clé + ' : coordonnée illisible ' + JSON.stringify(e)); continue; }
    const v = fichesDe('FR').filter(f => f.name === nom && Math.abs(f.lat - lat) < 1e-3 && Math.abs(f.lon - lon) < 1e-3);
    if(v.length === 0) bad.push('IGN_COORD_FIXES ' + clé + ' : aucune fiche française publiée à la position corrigée ('
      + lat + ',' + lon + ') — la correction n\'est plus appliquée');
  }
  assert.deepEqual(bad, []);
});

// ---------------------------------------------------------------------------------------------------------------
// Ces deux derniers tests chargent le moteur pour ses fonctions de MASSE TERRESTRE. Il ne charge pas les lieux ici
// (0,2 s) : seules ses fonctions internes sont sollicitées.
const Engine = require(path.join(ROOT, 'lib', 'trip-engine.js'));
const parseCommunes = Engine.internals.parseCommunesFile;
const landmassOf = Engine.internals.landmassOf;

const fichesAnalyséesParPays = new Map();
function fichesAnalyséesDe(cc){
  if(!fichesAnalyséesParPays.has(cc)){
    const f = TripData.COUNTRIES[cc] && TripData.COUNTRIES[cc].file;
    const p = f && path.join(DATA, f);
    fichesAnalyséesParPays.set(cc, p && fs.existsSync(p) ? parseCommunes(fs.readFileSync(p, 'utf8'), cc) : []);
  }
  return fichesAnalyséesParPays.get(cc);
}

test('Cap-Vert : les neuf boîtes d\'îles sont disjointes et contiennent TOUS les lieux publiés', () => {
  // Voir CV_ISLAND_BOXES (public/js/trip-data.js). Ces boîtes décident sur quelle ÎLE tombe un lieu quand son
  // concelho ne suffit pas : deux boîtes qui se chevauchent rendent le rattachement arbitraire, et un lieu hors
  // de toute boîte retombe dans un fourre-tout d'où aucun ferry ne part. Les deux défauts ont existé — les boîtes
  // avaient d'abord été arrondies VERS L'INTÉRIEUR, ce qui laissait 19 lieux côtiers hors de leur propre île, et
  // la « Ponta Verde » posée sur Santiago faisait se chevaucher Fogo et Santiago.
  const B = TripData.CV_ISLAND_BOXES;
  const clés = Object.keys(B);
  assert.equal(clés.length, 9, 'attendu neuf boîtes, trouvé ' + clés.length);
  const chevauchements = [];
  for(let i = 0; i < clés.length; i++){
    for(let j = i + 1; j < clés.length; j++){
      const a = B[clés[i]], b = B[clés[j]];
      if(a[0] <= b[1] && b[0] <= a[1] && a[2] <= b[3] && b[2] <= a[3]) chevauchements.push(clés[i] + ' / ' + clés[j]);
    }
  }
  assert.deepEqual(chevauchements, [], 'boîtes qui se chevauchent : le rattachement à une île devient arbitraire');
  const dehors = [], multiples = [];
  for(const p of fichesAnalyséesDe('CV')){
    const dans = clés.filter(k => { const b = B[k]; return p.lat >= b[0] && p.lat <= b[1] && p.lon >= b[2] && p.lon <= b[3]; });
    if(dans.length === 0) dehors.push(p.name + ' (' + p.lat + ',' + p.lon + ')');
    if(dans.length > 1) multiples.push(p.name + ' -> ' + dans.join(', '));
  }
  assert.deepEqual(multiples, []);
  assert.deepEqual(dehors, [], 'lieux capverdiens hors de toute boîte d\'île — ils retomberaient dans un fourre-tout sans ferry');
});

// Masse terrestre de chacune des fiches dont le code postal a été effacé, RELEVÉE AVANT la correction et figée ici.
// C'est ce qui rend l'effacement démontrablement INERTE : le code postal nourrit les règles d'île de plusieurs pays
// (Croatie, Danemark, Suède, Grèce, Royaume-Uni), et l'effacer aurait pu faire glisser un lieu d'une île vers le
// continent sans que rien ne le signale. Les quatre masses insulaires ci-dessous sont les cas qui le prouvent.
const MASSES_ATTENDUES = {
  'DE|Saarbrücken': 'continental', 'DE|Albertstadt': 'continental', 'DE|Heidingsfeld': 'continental',
  'NL|Zeewolde': 'continental',
  'ES|Aldeire': 'continental', 'ES|Zurbao / Zurbano': 'continental', 'ES|Vinyols i els Arcs': 'continental',
  'ES|Ribes Altes': 'continental', 'ES|San Andrés': 'tenerife', 'ES|Hoya Grande': 'tenerife',
  'ES|El Martinete': 'continental', 'ES|Vallverd de Queralt': 'continental', 'ES|Meirás': 'continental',
  'ES|Corneda': 'continental', 'ES|Aeta': 'continental',
  'IT|Villa Aresu': 'sardinia', 'IT|Bilgalzu': 'sardinia', 'IT|Pauli Mannu': 'sardinia',
  'PT|Laranjeiras': 'continental', 'PT|Hortas': 'continental', 'PT|Fontainhas': 'continental',
  'PT|Piedade': 'pico',
  'HR|Gornji Dingač': 'continental',
  'PL|Godowa': 'continental', 'PL|Gniewczyna': 'continental', 'PL|Staroscin': 'continental',
  'PL|Jeziorki Zabartowskie': 'continental', 'PL|Kunów': 'continental', 'PL|Szydlice': 'continental',
  'PL|Grójec': 'continental'
};
test('corrections : effacer un code postal n\'a déplacé aucune fiche de masse terrestre', () => {
  const bad = [];
  for(const e of C.CP_CONTREDIT){
    const clé = e.cc + '|' + e.name;
    const attendu = MASSES_ATTENDUES[clé];
    if(attendu === undefined){ bad.push(clé + ' : entrée de CP_CONTREDIT sans masse terrestre figée (relever la valeur AVANT de corriger)'); continue; }
    const f = fichesAnalyséesDe(e.cc).find(x => x.name === e.name
      && Math.abs(x.lat - e.lat) < 1e-4 && Math.abs(x.lon - e.lon) < 1e-4);
    if(!f){ bad.push(clé + ' : fiche introuvable'); continue; }
    const m = landmassOf(f) || '(aucune)';
    if(m !== attendu) bad.push(clé + ' : masse « ' + m + ' », attendu « ' + attendu + ' »');
  }
  for(const clé of Object.keys(MASSES_ATTENDUES)){
    if(!C.CP_CONTREDIT.some(e => e.cc + '|' + e.name === clé)) bad.push(clé + ' : masse figée pour une fiche qui a quitté CP_CONTREDIT');
  }
  assert.deepEqual(bad, []);
});
