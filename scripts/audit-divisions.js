// CRIBLE DES DIVISIONS PAR VOTE DU VOISINAGE — le discriminant qui a trouvé Gornji Dingač.
//
// Le crible historique cherche un lieu ISOLÉ dans sa division : au moins 50 km du plus proche des siens, moins de
// 3 km d'une autre division, et un RAPPORT d'au moins 10 entre les deux. Gornji Dingač échoue aux DEUX portes :
// 19,1 km d'écart, rapport 8,97. Abaisser le seuil ne suffit donc pas — mesuré : 1 499 suspects à 15 km et 1 182 à
// 25 km, presque tous du bruit, et la fiche reste introuvable dans les deux.
//
// Ici, on ne mesure aucune distance à sa propre division : on demande au VOISINAGE de voter, exactement comme le
// crible des codes postaux. Est signalé un lieu dont l'étiquette diffère de celle de TOUS ses voisins proches,
// lesquels s'accordent entre eux. Aucune table de référence : les lieux publiés font foi.
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
const E = require(ROOT + 'lib/trip-engine.js');
const parse = E.internals.parseCommunesFile;

const RAYON_KM = Number(process.env.RAYON || 12);
const MIN_VOISINS = Number(process.env.MINV || 5);

const R = 6371, rad = v => v * Math.PI / 180;
function km(a, b){
  const dLa = rad(b.lat - a.lat), dLo = rad(b.lon - a.lon);
  const h = Math.sin(dLa/2)**2 + Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLo/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}
let total = 0;
var ARGS = process.argv.slice(2).filter(x => x.charAt(0) !== '-');
if(!ARGS.length){
  ARGS = fs.readdirSync(path.join(ROOT, 'public', 'data'))
    .filter(f => /^communes-[a-z][a-z].txt$/.test(f))
    .map(f => f.slice(9, 11).toUpperCase());
  ARGS.push('FR');
}
const SORTIE = [];
for(const spec of ARGS){
  const cc = spec.toUpperCase();
  const f = cc === 'FR' ? 'communes.txt' : 'communes-' + cc.toLowerCase() + '.txt';
  let l;
  try { l = parse(fs.readFileSync(path.join(ROOT, 'public', 'data', f), 'utf8'), cc); }
  catch(e){ console.log(cc + ' : fichier absent'); continue; }
  const pts = l.filter(x => isFinite(x.lat) && isFinite(x.lon) && String(x.dept || '').length > 0);
  if(pts.length < 100){ console.log(cc + ' : trop peu d\'étiquettes exploitables'); continue; }
  const g = new Map();
  pts.forEach(p => { const k = Math.floor(p.lat*4) + '|' + Math.floor(p.lon*4);
    if(!g.has(k)) g.set(k, []); g.get(k).push(p); });
  const t0 = Date.now(); const trouves = [];
  for(const p of pts){
    const mien = String(p.dept || '');
    const cLa = Math.floor(p.lat*4), cLo = Math.floor(p.lon*4), port = Math.ceil(RAYON_KM/27) + 1;
    const compte = {}; let n = 0;
    for(let a = cLa-port; a <= cLa+port; a++) for(let b = cLo-port; b <= cLo+port; b++){
      const c = g.get(a + '|' + b); if(!c) continue;
      for(const q of c){ if(q === p) continue; if(km(p, q) > RAYON_KM) continue;
        const k = String(q.dept || ''); compte[k] = (compte[k] || 0) + 1; n++; }
    }
    if(n < MIN_VOISINS) continue;
    if(compte[mien]) continue;                       // au moins un voisin partage son étiquette
    const cles = Object.keys(compte);
    if(cles.length !== 1) continue;                  // les voisins doivent s'accorder ENTRE EUX
    SORTIE.push({ cc, nom: p.name, lat: p.lat, lon: p.lon, pop: Number(p.pop) || 0, mien, voisin: cles[0], n, div: p.dept });
    trouves.push({ nom: p.name, lat: p.lat, lon: p.lon, pop: Number(p.pop) || 0, mien, voisin: cles[0], n });
  }
  total += trouves.length;
  trouves.sort((a, b) => b.pop - a.pop);
  console.log(cc + ' — ' + pts.length + ' lieux, ' + trouves.length + ' suspect(s) (' + Math.round((Date.now()-t0)/1000) + ' s)');
  trouves.slice(0, 6).forEach(x => console.log('    ' + x.nom.padEnd(24) + String(x.pop).padStart(7) + ' hab.   « '
    + x.mien + ' »   ses ' + x.n + ' voisins sont tous en « ' + x.voisin + ' »'));
}
console.log('\nTOTAL : ' + total + ' suspect(s)  [rayon ' + RAYON_KM + ' km, au moins ' + MIN_VOISINS + ' voisins]');
if(process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(SORTIE, null, 1));
