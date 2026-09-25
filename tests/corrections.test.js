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

// Le champ publié peut porter PLUSIEURS codes séparés par des virgules (Gyumri en porte treize) ; les tables
// de correction, elles, retiennent le premier. On compare donc ce qui est comparable.
const premierCode = f => String(f.cp || '').split(',')[0];

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
  assert.ok(C.CP_CONTREDIT.length >= 199, 'CP_CONTREDIT est tombée à ' + C.CP_CONTREDIT.length + ' entrées (199 au minimum)');
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
      + 'détruirait la donnée juste. Sa bonne position reste inconnue' },
  // Seconde passe (24/09/2026) : seize fiches que la CARTE a innocentées, et quatre écartées à la main.
  { cc: 'HU', name: "Budapest", lat: 47.4984, lon: 19.0404, cp: '1007',
    pourquoi: "les codes 1xxx SONT Budapest, ses voisins en 2xxx sont ses banlieues : L = 1 est trop grossier pour la Hongrie" },
  { cc: 'AM', name: "Gyumri", lat: 40.7931, lon: 43.8464, cp: '3101',
    pourquoi: "la carte confirme 3101" },
  { cc: 'UA', name: "Slavutych", lat: 51.5225, lon: 30.7181, cp: '07101',
    pourquoi: "ville-enclave administrée par l'oblast de Kiev (07xxx) mais posée en Tchernihiv : le code suit l'administration, pas la géographie" },
  { cc: 'BG', name: "Topolovgrad", lat: 42.0833, lon: 26.3333, cp: '6560',
    pourquoi: "la carte confirme 6560" },
  { cc: 'US', name: "Niagara", lat: 45.7713, lon: -87.9948, cp: '54151',
    pourquoi: "la carte confirme 54151" },
  { cc: 'US', name: "Cascade Locks", lat: 45.6698, lon: -121.8906, cp: '97014',
    pourquoi: "la carte confirme 97014" },
  { cc: 'AU', name: "Monteagle", lat: -34.1833, lon: 148.35, cp: '2594',
    pourquoi: "la carte confirme 2594" },
  { cc: 'AU', name: "Knebsworth", lat: -38, lon: 141.8667, cp: '3286',
    pourquoi: "la carte confirme 3286" },
  { cc: 'AU', name: "Adelaide Airport", lat: -34.9391, lon: 138.5341, cp: '5950',
    pourquoi: "la carte confirme 5950 — code propre à l'aéroport" },
  { cc: 'AU', name: "Gungahlin", lat: -35.2167, lon: 149.1333, cp: '2911',
    pourquoi: "la carte confirme 2911" },
  { cc: 'AU', name: "Collins Cap", lat: -42.85, lon: 147.15, cp: '7012',
    pourquoi: "la carte confirme 7012" },
  { cc: 'EC', name: "Crucita", lat: -0.8706, lon: -80.5375, cp: '130119',
    pourquoi: "la carte donne 130154, du même district que 130119" },
  { cc: 'NO', name: "Bjoneroa", lat: 60.5237, lon: 10.2847, cp: '3522',
    pourquoi: "la carte confirme 3522" },
  { cc: 'US', name: "Lodi", lat: 33.5504, lon: -89.5209, cp: '39767',
    pourquoi: "la carte donne 39747, du même comté que 39767" },
  { cc: 'US', name: "Pope", lat: 35.6187, lon: -87.9895, cp: '37096',
    pourquoi: "la carte confirme 37096" },
  { cc: 'UY', name: "Boca del Cufré", lat: -34.4423, lon: -57.1476, cp: '80300',
    pourquoi: "la carte confirme 80300" },
  { cc: 'US', name: "Sacramento", lat: 38.5816, lon: -121.4944, cp: '94203',
    pourquoi: "code RÉEL et valide : 94203 est celui des boîtes postales de l'État de Californie. Ni le crible ni la carte ne distinguent « code d'ailleurs » de « autre code du même endroit »" },
  { cc: 'US', name: "Holtsville", lat: 40.8154, lon: -73.0451, cp: '00501',
    pourquoi: "code RÉEL et valide : 00501 est celui du fisc fédéral américain" },
  { cc: 'AU', name: "Kalamunda", lat: -31.9737, lon: 116.0584, cp: '6926',
    pourquoi: "plage australienne de boîtes postales (6900-6999)" },
  { cc: 'AU', name: "Manchester Square", lat: -34.5994, lon: 150.4017, cp: '1209',
    pourquoi: "plage australienne de boîtes postales (1000-1999)" },
];
test('corrections : les fiches innocentées par la carte gardent leur code postal', () => {
  const bad = [];
  for(const e of CP_ÉPARGNÉS){
    const f = uneSeuleFiche(bad, 'CP_ÉPARGNÉS', e);
    if(f && premierCode(f) !== e.cp) bad.push('CP_ÉPARGNÉS : ' + e.cc + ' ' + JSON.stringify(e.name) + ' publié avec '
      + JSON.stringify(premierCode(f)) + ', attendu ' + JSON.stringify(e.cp) + ' — ' + e.pourquoi);
    if(C.cpContredit(e.cc, e.name, e.lat, e.lon)) bad.push('CP_ÉPARGNÉS : ' + e.cc + ' ' + JSON.stringify(e.name)
      + ' est entré dans CP_CONTREDIT, alors que la carte le CONFIRME — ' + e.pourquoi);
  }
  assert.deepEqual(bad, []);
});

test('corrections : les étiquettes de région démenties par la carte sont celles du terrain', () => {
  // Voir DIVISION_FIXES : chaque étiquette a été confrontée au géocodage inverse, une par une, en comparant le
  // lieu à son VOISIN d'un kilomètre plutôt qu'à son étiquette — ce qui se passe de toute table de correspondance
  // entre rangs administratifs.
  assert.ok(C.DIVISION_FIXES.length >= 59, 'DIVISION_FIXES est tombée à ' + C.DIVISION_FIXES.length + ' entrées (59 au minimum)');
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

test('corrections : une seule graphie par région et par pays', () => {
  // Voir ETIQUETTE_UNIFIEE. L Allemagne portait 43 étiquettes pour seize Länder : 893 fiches en « Lower Saxony »
  // quand 7 890 sont en « Niedersachsen ». Le test garde les DEUX sens : la graphie minoritaire ne doit plus être
  // publiée, et la graphie majoritaire doit exister — sans quoi la table renverrait vers un nom inconnu.
  const bad = [];
  for(const cc of Object.keys(C.ETIQUETTE_UNIFIEE)){
    const fiches = fichesDe(cc);
    const etiquettes = new Set(fiches.map(f => f.div));
    for(const de of Object.keys(C.ETIQUETTE_UNIFIEE[cc])){
      const vers = C.ETIQUETTE_UNIFIEE[cc][de];
      const restants = fiches.filter(f => f.div === de).length;
      if(restants) bad.push(cc + ' : ' + restants + ' fiche(s) portent encore « ' + de + ' »');
      if(!etiquettes.has(vers)) bad.push(cc + ' : la graphie retenue « ' + vers + ' » n est portée par aucune fiche');
      if(C.uniformiseEtiquette(cc, de) !== vers) bad.push(cc + ' : uniformiseEtiquette() ne rend plus « ' + vers + ' » pour « ' + de + ' »');
    }
  }
  assert.deepEqual(bad, []);
});

// Régions que le recouvrement territorial accusait et que la CARTE a sauvées : elles doivent RESTER distinctes.
const ETIQUETTES_EPARGNEES = [
  { cc: 'DE', region: 'Saarland', pourquoi: 'Land à part entière, 57 % de recouvrement avec la Rhénanie-Palatinat' },
  { cc: 'DE', region: 'Bremen', pourquoi: 'Land enclavé à 100 % dans la Basse-Saxe — le recouvrement seul le condamnait' },
  { cc: 'SE', region: 'Håbo', pourquoi: 'commune d\'Uppsala, HOMONYME de Habo (Jönköping) à un diacritique près. En suédois le å est une lettre à part entière : ce sont deux communes distinctes, séparées de 246 km. C\'est le cas qui a imposé de distinguer une différence de CASSE, certaine, d\'une différence de DIACRITIQUE, à vérifier' }
];
test('corrections : les régions sauvées par la carte gardent leur étiquette', () => {
  const bad = [];
  for(const e of ETIQUETTES_EPARGNEES){
    const n = fichesDe(e.cc).filter(f => f.div === e.region).length;
    if(!n) bad.push(e.cc + ' : plus aucune fiche en « ' + e.region + ' » — ' + e.pourquoi);
    if(C.uniformiseEtiquette(e.cc, e.region)) bad.push(e.cc + ' : « ' + e.region + ' » est entrée dans ETIQUETTE_UNIFIEE, alors que la carte la CONFIRME — ' + e.pourquoi);
  }
  assert.deepEqual(bad, []);
});
// RANG DE L'ÉTIQUETTE ET VRAIS CODES POSTAUX (25/09/2026). Le Pakistan et le Brésil ont gagné 148 839 vrais codes
// postaux là où ils portaient un identifiant de région ISO (« PK-JK », « BR-SP »). Ce gain était bloqué parce que la
// régénération abîmait les étiquettes, de deux façons distinctes :
//   - le PAKISTAN publiait une même province sous deux noms, le fichier postal et le dump ne l'écrivant pas pareil
//     (« Gilgit Baltistan » / « Gilgit-Baltistan », « Azad Jammu and Kashmir » / « Azad Kashmir », « Federal
//     Capital » / « Islamabad ») — réglé par ETIQUETTE_UNIFIEE, la carte ayant tranché chaque forme ;
//   - le BRÉSIL faisait glisser 33 497 fiches de l'ÉTAT à la COMMUNE (« Paraíba » -> « Alagoa Grande »), le
//     changement de rang refusé à l'Inde le même jour — réglé par REGION_DU_DUMP, qui donne les codes sans toucher
//     aux étiquettes.
// Ces deux tests gardent le résultat par les deux bouts : le gain ne doit pas se perdre, le rang ne doit pas bouger.
test('corrections : le Pakistan et le Brésil gardent leurs vrais codes postaux', () => {
  const bad = [];
  for(const [cc, mini] of [['PK', 100000], ['BR', 45000]]){
    const fiches = fichesDe(cc);
    const vrais = fiches.filter(f => f.cp && !/^[A-Za-z]{2}-/.test(f.cp)).length;
    if(vrais < mini) bad.push(cc + ' : ' + vrais + ' vrais codes postaux, attendu au moins ' + mini
      + ' — un identifiant de région ISO n\'est pas un code postal');
  }
  assert.deepEqual(bad, []);
});
test('corrections : l\'étiquette reste la PROVINCE au Pakistan et l\'ÉTAT au Brésil', () => {
  const bad = [];
  // Sept provinces et territoires pakistanais — plus UNE fiche sans division, « Ayoob Kandra Chowk », qui n'en a
  // jamais eu et n'est donc pas comptée ici — et vingt-sept unités fédérées brésiliennes.
  for(const [cc, attendu] of [['PK', 7], ['BR', 27]]){
    const divs = new Set(fichesDe(cc).map(f => f.div).filter(Boolean));
    if(divs.size !== attendu) bad.push(cc + ' : ' + divs.size + ' étiquettes distinctes, attendu ' + attendu
      + ' — le rang a changé (commune au lieu de province ou d\'État), ou une région est écrite de deux façons');
  }
  // Les trois formes que la carte a écartées au Pakistan ne doivent réapparaître sous aucune fiche.
  for(const forme of ['Gilgit Baltistan', 'Azad Jammu and Kashmir', 'Federal Capital']){
    const n = fichesDe('PK').filter(f => f.div === forme).length;
    if(n) bad.push('PK : ' + n + ' fiche(s) portent encore « ' + forme + ' »');
  }
  assert.deepEqual(bad, []);
});
// UNE ZONE DE TENSION S'APPARIE PAR LE NOM DE RÉGION, à l'exécution, et c'est un couplage silencieux entre une
// donnée de SÉCURITÉ et une étiquette de région. Mesuré le 25/09/2026 : renommer les comtés kényans a fait cesser de
// s'appliquer trois mises en garde du Quai d'Orsay — Mandera, Wajir, Garissa et l'est d'Isiolo — sans que rien ne
// casse. trip-data.js ne bougeait même pas, puisqu'il recopie les noms tels quels ; seul le générateur de zones
// protestait, dans une ligne de journal qu'il était facile de ne pas lire. Ce test refuse qu'une règle cite une
// région qu'aucune fiche ne porte.
test('zones de tension : chaque région citée par une règle existe dans les données publiées', () => {
  const bad = [];
  for(const z of (TripData.TENSION_ZONES || [])){
    const fiches = fichesDe(z.country);
    if(!fiches.length) continue;   // pays sans fichier publié : rien à vérifier ici
    const divs = new Set(fiches.map(f => f.div).filter(Boolean));
    for(const clé of ['match', 'except']){
      for(const r of ((z[clé] && z[clé].regions) || [])){
        if(!divs.has(r)) bad.push(z.country + ' : la règle « ' + z.label + ' » cite « ' + r
          + ' » en ' + clé + ', qu\'aucune fiche ne porte — la mise en garde ne s\'applique plus à personne');
      }
    }
  }
  assert.deepEqual(bad, []);
});
// CODES POSTAUX RÉCOLTÉS SUR OPENSTREETMAP (25/09/2026). 1 277 fiches qui n'avaient AUCUN code en portent un,
// pris dans OSM via Nominatim là où le fichier postal GeoNames n'a aucun point à moins de 15 km. Ces codes ont
// survécu à trois cribles, dont le dernier est le plus dur : le préfixe doit s'accorder avec le code GeoNames du
// lieu publié le plus proche — une source indépendante de celle qui l'a fourni. Le témoin justifiait cette dureté :
// entre eux, les codes GeoNames voisins s'accordent 94 % du temps ; la moisson brute, 58 %.
// Ce test garde les deux bouts : les codes retenus doivent être PUBLIÉS, et ils ne doivent jamais avoir recouvert
// un code existant.
test('OpenStreetMap : les codes postaux récoltés sont publiés, et n\'ont recouvert aucun code existant', () => {
  const DOSSIER = path.join(ROOT, 'scripts', 'postal-osm');
  if(!fs.existsSync(DOSSIER)) return;   // moisson absente : rien à garder
  const bad = [];
  let total = 0;
  for(const f of fs.readdirSync(DOSSIER).filter(x => /^[A-Z]{2}\.txt$/.test(x))){
    const cc = f.slice(0, 2);
    const fiches = fichesDe(cc);
    if(!fiches.length) continue;
    const index = new Map();
    fiches.forEach(x => index.set(x.lat.toFixed(4) + ',' + x.lon.toFixed(4) + '|' + x.name, x));
    for(const l of fs.readFileSync(path.join(DOSSIER, f), 'utf8').split('\n')){
      if(!l || l.charAt(0) === '#') continue;
      const c = l.split('\t');
      if(c.length < 4 || !c[2]) continue;
      total++;
      const fiche = index.get(c[0] + ',' + c[1] + '|' + c[3]);
      if(!fiche){ bad.push(cc + ' : « ' + c[3] + ' » (' + c[0] + ',' + c[1] + ') ne correspond à aucune fiche publiée'); continue; }
      if(fiche.cp !== c[2]) bad.push(cc + ' : « ' + c[3] + ' » devrait porter « ' + c[2] + ' », publié « ' + (fiche.cp || 'vide') + ' »');
    }
  }
  assert.ok(total > 1000, 'la moisson OpenStreetMap ne compte plus que ' + total + ' codes, contre 1 277 le 25/09/2026');
  assert.deepEqual(bad.slice(0, 10), []);
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
  "AM|Vardenis": "continental",
  "AU|Bowen Mountain": "australia",
  "AU|Greenmount": "australia",
  "AU|Langley": "australia",
  "AU|Medway": "australia",
  "AU|Mogo": "australia",
  "AU|Moonee Beach": "australia",
  "AU|Mountain Spring Dairy": "australia",
  "AU|Rose Valley": "australia",
  "AU|Springfield": "australia",
  "AU|St Mary": "australia",
  "AU|Strathallan": "australia",
  "AU|The Grange": "australia",
  "AU|Tuross Head": "australia",
  "AU|Upper Ryans Creek": "australia",
  "AU|Woodlands": "australia",
  "CR|Quebrador": "northAmerica",
  "CZ|Lhotka": "continental",
  "DE|Albertstadt": "continental",
  "DE|Heidingsfeld": "continental",
  "DE|Saarbrücken": "continental",
  "ES|Aeta": "continental",
  "ES|Aldeire": "continental",
  "ES|Corneda": "continental",
  "ES|El Martinete": "continental",
  "ES|Hoya Grande": "tenerife",
  "ES|Meirás": "continental",
  "ES|Ribes Altes": "continental",
  "ES|San Andrés": "tenerife",
  "ES|Vallverd de Queralt": "continental",
  "ES|Vinyols i els Arcs": "continental",
  "ES|Zurbao / Zurbano": "continental",
  "HR|Gornji Dingač": "continental",
  "ID|Kebon Kelapa": "java",
  "IN|Chinchura": "continental",
  "IN|Handigund": "continental",
  "IN|Jamrauli": "continental",
  "IN|Mathurāpur": "continental",
  "IN|Siripuram": "continental",
  "IN|Thotta Rāmachandrapuram": "continental",
  "IT|Bilgalzu": "sardinia",
  "IT|Pauli Mannu": "sardinia",
  "IT|Villa Aresu": "sardinia",
  "NL|Zeewolde": "continental",
  "PL|Gniewczyna": "continental",
  "PL|Godowa": "continental",
  "PL|Grójec": "continental",
  "PL|Jeziorki Zabartowskie": "continental",
  "PL|Kunów": "continental",
  "PL|Staroscin": "continental",
  "PL|Szydlice": "continental",
  "PT|Fontainhas": "continental",
  "PT|Hortas": "continental",
  "PT|Laranjeiras": "continental",
  "PT|Piedade": "pico",
  "PT|Pinhal Novo": "continental",
  "RO|Oreavu": "continental",
  "RU|Anyshtaikha": "continental",
  "RU|Araslambayevskiy": "continental",
  "RU|Berëzovo": "continental",
  "RU|Blagodatka": "continental",
  "RU|Chernovskoye": "continental",
  "RU|Firyusikha": "continental",
  "RU|Gashkovo": "continental",
  "RU|Georgiyevka": "continental",
  "RU|Grozny": "continental",
  "RU|Internatsional’nyy": "continental",
  "RU|Izobil’nyy": "continental",
  "RU|Kamenushka": "continental",
  "RU|Kiselëvka": "continental",
  "RU|Konstantinovsk": "continental",
  "RU|Lebyazh’ye": "continental",
  "RU|Malinovka": "continental",
  "RU|Malinovo": "continental",
  "RU|Mikhaylovka": "continental",
  "RU|Moiseyevka": "continental",
  "RU|Nikol’skiy": "continental",
  "RU|Nikol’skoye": "continental",
  "RU|Ozerki": "continental",
  "RU|Petrovskiy": "continental",
  "RU|Progress": "continental",
  "RU|Rodina": "continental",
  "RU|Rozovka": "continental",
  "RU|Sergiyevskoye": "continental",
  "RU|Sotsposëlok": "continental",
  "RU|Stakhanovskiy": "continental",
  "RU|Stantsionnyy-Polevskoy": "continental",
  "RU|Stepnoy": "continental",
  "RU|Tenishevo": "continental",
  "RU|Ternovskaya": "continental",
  "RU|Tsentral’nyy": "continental",
  "RU|Verkhniye Yaki": "continental",
  "RU|Viflyantsev": "continental",
  "RU|Yachmeneva": "continental",
  "RU|Yelizavetino": "continental",
  "TN|Douar el Haj Salah": "continental",
  "TR|Esenköy": "continental",
  "TR|Isparta": "continental",
  "TR|Sürtme": "continental",
  "TR|Çiçekli": "continental",
  "TR|İncirli": "continental",
  "UA|Baranivka": "continental",
  "UA|Berezhnytsia": "continental",
  "UA|Borysivka": "continental",
  "UA|Brovarky": "continental",
  "UA|Brusivka": "continental",
  "UA|Bubnivska Slobidka": "continental",
  "UA|Buzova Paskivka": "continental",
  "UA|Bystrytsia": "continental",
  "UA|Chystopillia": "continental",
  "UA|Derylove": "continental",
  "UA|Dibrova": "continental",
  "UA|Didivshchyna": "continental",
  "UA|Fediivka": "continental",
  "UA|Grabovo": "continental",
  "UA|Heronymivka": "continental",
  "UA|Hlyniane": "continental",
  "UA|Hlynianka": "continental",
  "UA|Hulyaypole": "continental",
  "UA|Illinske": "continental",
  "UA|Karlivka": "continental",
  "UA|Kharkivtsi": "continental",
  "UA|Kobylianka": "continental",
  "UA|Kochubeyivka": "continental",
  "UA|Komarivka": "continental",
  "UA|Kotliarivka": "continental",
  "UA|Kyselivka": "continental",
  "UA|Lavryky": "continental",
  "UA|Lebedyn": "continental",
  "UA|Lisove": "continental",
  "UA|Litky": "continental",
  "UA|Lonivka": "continental",
  "UA|Luhovyky": "continental",
  "UA|Lypyne": "continental",
  "UA|Mircha": "continental",
  "UA|Mlyny": "continental",
  "UA|Moskalenky": "continental",
  "UA|Mykhaylivka": "continental",
  "UA|Mykilske": "continental",
  "UA|Mykolaivka": "continental",
  "UA|Myrivka": "continental",
  "UA|Nahoriany": "continental",
  "UA|Naraivka": "continental",
  "UA|Nemyrivka": "continental",
  "UA|Novodanylivka": "continental",
  "UA|Novovodyane": "continental",
  "UA|Osykuvate": "continental",
  "UA|Pidlisky": "continental",
  "UA|Pidlissia": "continental",
  "UA|Pidluby": "continental",
  "UA|Pishchane": "continental",
  "UA|Pivdenne": "continental",
  "UA|Ploske": "continental",
  "UA|Pokhuvka": "continental",
  "UA|Prokhorivka": "continental",
  "UA|Prosika": "continental",
  "UA|Pyryatyn": "continental",
  "UA|Rokytne": "continental",
  "UA|Rozhdestvenske": "continental",
  "UA|Rozhny": "continental",
  "UA|Rozumivka": "continental",
  "UA|Severynivka": "continental",
  "UA|Shakhove": "continental",
  "UA|Shovkopliasy": "continental",
  "UA|Sichove": "continental",
  "UA|Simianivka": "continental",
  "UA|Skybyntsi": "continental",
  "UA|Slobidske": "continental",
  "UA|Sloboda": "continental",
  "UA|Sofiivka": "continental",
  "UA|Sokolivshchyna": "continental",
  "UA|Sotniki": "continental",
  "UA|Spivakivka": "continental",
  "UA|Stebnyk": "continental",
  "UA|Step": "continental",
  "UA|Striletska Pushkarka": "continental",
  "UA|Sushky": "continental",
  "UA|Svystunivka": "continental",
  "UA|Talalaivka": "continental",
  "UA|Troianivka": "continental",
  "UA|Trostyanets": "continental",
  "UA|Tseniava": "continental",
  "UA|Valeryanivka": "continental",
  "UA|Velykosillia": "continental",
  "UA|Vepryk": "continental",
  "UA|Vovkivka": "continental",
  "UA|Vynohradivka": "continental",
  "UA|Vyshniv": "continental",
  "UA|Vysochynivka": "continental",
  "UA|Yabluniv": "continental",
  "UA|Yaremivka": "continental",
  "UA|Yasenivka": "continental",
  "UA|Yerkivtsi": "continental",
  "UA|Yurivka": "continental",
  "UA|Zabiliany": "continental",
  "UA|Zavitne": "continental",
  "UA|Zoria": "continental",
  "UY|Pan de Azúcar": "southAmerica",
  "UY|Puntas de Cañada Grande": "southAmerica"
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
