'use strict';
// CODES POSTAUX MANQUANTS, COMBLÉS PAR OPENSTREETMAP.
//
// 99 109 fiches publiées n'ont aucun code postal, parce qu'aucun point du fichier postal GeoNames ne passe à moins
// de 15 km. OpenStreetMap en connaît une partie : Nominatim CALCULE un code postal en interrogeant les adresses
// voisines et les frontières postales, là où GeoNames n'a qu'une liste de points.
//
// CE QUI A ÉTÉ MESURÉ AVANT D'ÉCRIRE CET OUTIL (25/09/2026), parce que l'ampleur décide de la méthode :
//   - Le code postal n'est presque jamais posé sur le NŒUD du village : 171 sur 9 214 au Monténégro, soit 1,9 %.
//     Moissonner les nœuds « place » par Overpass ne donnerait donc rien. C'est Nominatim qui sait le déduire.
//   - Sur 40 fiches tirées dans dix pays, Nominatim rend un code dans 60 % des cas — mais 85 % pour les lieux
//     PEUPLÉS et 35 % pour ceux à population nulle.
//   - Les 99 109 fiches demanderaient 27,5 heures d'interrogation continue à une requête par seconde, ou
//     19 046 tuiles Overpass. Aucun de ces deux services gratuits ne doit absorber cela pour un tel gain.
// D'où le PÉRIMÈTRE : les fiches sans code postal qui ont une POPULATION — 6 243, soit 1 h 45 — et qui sont aussi
// celles qu'un voyageur peut réellement choisir au départ, la recherche classant par population.
//
// RÈGLES D'USAGE, tenues par le code et non par la promesse : une requête par seconde, en-tête identifiant le
// projet, et un CACHE sur disque qui fait qu'un lieu n'est jamais redemandé — y compris entre deux exécutions,
// l'interruption étant la règle sur un travail de deux heures.
//
// ATTRIBUTION : les codes obtenus viennent d'OpenStreetMap, sous licence ODbL. Le pied de page du site cite déjà
// OpenStreetMap parmi ses sources ; ce lot en étend la portée aux codes postaux, et le journal le dit.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
const DOSSIER = path.join(__dirname, 'postal-osm');
const CACHE = path.join(DOSSIER, 'cache.jsonl');
const UA = 'CapSurLInconnu/1.0 (fetch-osm-postcodes; https://github.com/lume419/cap-sur-linconnu)';
const PAUSE_MS = 1100;          // une requête par seconde, avec une marge
const POP_MIN = +(process.env.POP_MIN || 1);

// L'IRLANDE DEMANDE UNE COUPE, et c'est le seul pays dans ce cas. Un Eircode ne désigne pas une commune mais UN
// BÂTIMENT : « V95 X754 », rendu pour Ennis, est le code d'un commerce de photographie. Seuls ses TROIS PREMIERS
// caractères — la clé de routage — désignent une zone postale.
// Ce pays avait d'abord été écarté, faute de savoir si tronquer était légitime. La donnée a répondu : les 7 186
// codes irlandais DÉJÀ PUBLIÉS sont tous longs de trois caractères (« E45 », « P36 », « X91 »), le fichier postal
// GeoNames ne livrant que des clés de routage. Garder l'Eircode entier serait donc l'anomalie ; le tronquer le
// remet dans la forme du pays. La coupe est faite ICI, à la récolte, pour que le cache ne conserve jamais la partie
// qui désigne un bâtiment précis — elle ne nous regarde pas.
const COUPE = { IE: cp => String(cp).toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 3) };
const PAYS_ECARTES = {};

function fiches(cc){
  const f = ROOT + 'public/data/communes-' + cc.toLowerCase() + '.txt';
  if(!fs.existsSync(f)) return [];
  const out = [];
  for(const l of fs.readFileSync(f, 'utf8').split('\n')){
    if(!l) continue;
    const c = l.split(';'), ll = (c[1] || '').split(',');
    if(c[2]) continue;                       // déjà un code postal : on n'y touche pas
    const pop = parseInt(c[0], 10) || 0;
    if(pop < POP_MIN) continue;
    out.push({ cc, pop, lat: +ll[1], lon: +ll[0], div: c[3] || '', nom: c[4] || '' });
  }
  return out;
}
function paysPublies(){
  return fs.readdirSync(path.join(ROOT, 'public', 'data'))
    .filter(f => /^communes-[a-z][a-z]\.txt$/.test(f)).map(f => f.slice(9, 11).toUpperCase());
}
const clef = p => p.cc + '|' + p.lat.toFixed(4) + '|' + p.lon.toFixed(4);

function lireCache(){
  const m = new Map();
  if(!fs.existsSync(CACHE)) return m;
  for(const l of fs.readFileSync(CACHE, 'utf8').split('\n')){
    if(!l) continue;
    try { const e = JSON.parse(l); m.set(e.k, e); } catch(x){ /* ligne tronquée par une interruption : ignorée */ }
  }
  return m;
}
const R = 6371, rad = v => v * Math.PI / 180;
function km(aLat, aLon, bLat, bLon){
  const h = Math.sin(rad(bLat - aLat) / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLon - aLon) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

(async () => {
  fs.mkdirSync(DOSSIER, { recursive: true });
  const demandes = (process.argv.slice(2).filter(x => x.charAt(0) !== '-').join(',') || '').toUpperCase();
  const pays = demandes ? demandes.split(',').filter(Boolean) : paysPublies();
  const cache = lireCache();
  let aFaire = [];
  for(const cc of pays){
    if(PAYS_ECARTES[cc]){ console.log(cc + ' : écarté — ' + PAYS_ECARTES[cc]); continue; }
    for(const p of fiches(cc)) if(!cache.has(clef(p))) aFaire.push(p);
  }
  aFaire.sort((a, b) => b.pop - a.pop);   // les plus peuplées d'abord : si le travail est coupé, il l'est sur le moins utile
  console.log(aFaire.length + ' lieu(x) à interroger (' + cache.size + ' déjà en cache), soit environ '
    + (aFaire.length * PAUSE_MS / 3600000).toFixed(1) + ' h');
  const flux = fs.createWriteStream(CACHE, { flags: 'a' });
  let obtenus = 0, vides = 0, erreurs = 0;
  for(let i = 0; i < aFaire.length; i++){
    const p = aFaire[i];
    const u = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&lat=' + p.lat + '&lon=' + p.lon;
    let e = { k: clef(p), cc: p.cc, nom: p.nom, pop: p.pop, lat: p.lat, lon: p.lon, le: new Date().toISOString().slice(0, 10) };
    try {
      const r = await fetch(u, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' } });
      if(!r.ok){ e.err = r.status; erreurs++; }
      else {
        const j = await r.json();
        const a = j.address || {};
        // La coupe s'applique AVANT l'écriture au cache (voir COUPE) : l'Eircode complet désigne un bâtiment, et
        // rien dans ce projet n'a besoin de cette précision-là. On garde ce que le pays publie, la clé de routage.
        const brut = a.postcode || null;
        e.cp = brut && COUPE[p.cc] ? (COUPE[p.cc](brut) || null) : brut;
        if(brut && e.cp !== brut) e.cpBrutTronqué = true;
        e.osm = j.name || null;
        // Distance entre NOTRE lieu et l'objet qu'OSM a rendu : c'est elle qui dira si le code est celui du lieu
        // ou celui d'un voisin. Enregistrée ici, jugée ailleurs (voir apply-osm-postcodes.js).
        if(j.lat && j.lon) e.km = +km(p.lat, p.lon, +j.lat, +j.lon).toFixed(3);
        if(e.cp) obtenus++; else vides++;
      }
    } catch(x){ e.err = String(x.message).slice(0, 80); erreurs++; }
    flux.write(JSON.stringify(e) + '\n');
    if(i % 50 === 0 || i === aFaire.length - 1){
      console.log('  ' + (i + 1) + '/' + aFaire.length + ' — ' + obtenus + ' codes, ' + vides + ' sans, ' + erreurs + ' erreurs');
    }
    await new Promise(s => setTimeout(s, PAUSE_MS));
  }
  flux.end();
  console.log('terminé : ' + obtenus + ' codes obtenus, ' + vides + ' sans code, ' + erreurs + ' erreurs.');
  console.log('Le cache est dans ' + path.relative(ROOT, CACHE) + ' — relancer ce script ne redemande rien.');
})();
