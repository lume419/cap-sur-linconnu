'use strict';
// DÉTECTE UNE MÊME RÉGION PUBLIÉE SOUS DEUX NOMS DANS LE MÊME PAYS.
//
// Signature, mesurée en Allemagne : 893 fiches portent « Lower Saxony » quand 7 890 portent « Niedersachsen »,
// 140 « Saxony » contre 4 422 « Sachsen », 57 « Thuringia » contre 2 991 « Thüringen ». Le pays compte 43
// étiquettes de région pour seize Länder. Sans effet sur les itinéraires, bien visible à l'écran.
//
// MÉTHODE, sans aucune table de référence. Le crible par vote du voisinage (audit-divisions.js) travaille FICHE
// PAR FICHE ; celui-ci travaille sur l'ÉTIQUETTE ENTIÈRE. Pour chaque étiquette A, on regarde le voisinage de
// CHACUNE de ses fiches : si presque toutes sont entourées d'une même autre étiquette B, plus répandue, alors A
// et B désignent le même territoire et A en est la graphie minoritaire.
//
// CE QUE CE CRIBLE NE PEUT PAS DÉCIDER, et c'est pourquoi il ne corrige rien tout seul : une région réellement
// ENCLAVÉE dans une autre a exactement la même signature. La carte tranche, comme pour les autres cribles.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
const E = require(ROOT + 'lib/trip-engine.js');
const parse = E.internals.parseCommunesFile;

const RAYON_KM = 12;
const MIN_VOISINS = 5;
const PART_MIN = 0.90;     // au moins 90 % des fiches de A entourées de B
const FACTEUR = 3;         // et B au moins trois fois plus répandue que A

const R = 6371, rad = v => v * Math.PI / 180;
function km(a, b){
  const dLa = rad(b.lat - a.lat), dLo = rad(b.lon - a.lon);
  const h = Math.sin(dLa/2)**2 + Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLo/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}

let ARGS = process.argv.slice(2).filter(x => x.charAt(0) !== '-');
if(!ARGS.length){
  ARGS = fs.readdirSync(path.join(ROOT, 'public', 'data'))
    .filter(f => /^communes-[a-z][a-z]\.txt$/.test(f))
    .map(f => f.slice(9, 11).toUpperCase());
  ARGS.push('FR');
}

const SORTIE = [];
for(const spec of ARGS){
  const cc = spec.toUpperCase();
  const f = cc === 'FR' ? 'communes.txt' : 'communes-' + cc.toLowerCase() + '.txt';
  let l;
  try { l = parse(fs.readFileSync(path.join(ROOT, 'public', 'data', f), 'utf8'), cc); }
  catch(e){ continue; }
  const pts = l.filter(x => isFinite(x.lat) && isFinite(x.lon) && String(x.dept || '').length > 0);
  if(pts.length < 50) continue;

  const compteEtiquette = new Map();
  pts.forEach(p => compteEtiquette.set(p.dept, (compteEtiquette.get(p.dept) || 0) + 1));
  if(compteEtiquette.size < 2) continue;

  const g = new Map();
  pts.forEach(p => { const k = Math.floor(p.lat*4) + '|' + Math.floor(p.lon*4);
    if(!g.has(k)) g.set(k, []); g.get(k).push(p); });
  const port = Math.ceil(RAYON_KM/27) + 1;

  // Pour chaque étiquette : quelle étiquette domine le voisinage de ses fiches ?
  const vote = new Map();        // A -> { B -> nombre de fiches de A dont le voisinage est majoritairement B }
  const juges = new Map();       // A -> nombre de fiches de A ayant assez de voisins pour voter
  for(const p of pts){
    const cLa = Math.floor(p.lat*4), cLo = Math.floor(p.lon*4);
    const compte = {}; let n = 0;
    for(let a = cLa-port; a <= cLa+port; a++) for(let b = cLo-port; b <= cLo+port; b++){
      const c = g.get(a + '|' + b); if(!c) continue;
      for(const q of c){ if(q === p) continue; if(km(p, q) > RAYON_KM) continue;
        compte[q.dept] = (compte[q.dept] || 0) + 1; n++; }
    }
    if(n < MIN_VOISINS) continue;
    juges.set(p.dept, (juges.get(p.dept) || 0) + 1);
    let majo = null, best = -1;
    for(const k of Object.keys(compte)) if(compte[k] > best){ best = compte[k]; majo = k; }
    if(majo === p.dept) continue;
    if(!vote.has(p.dept)) vote.set(p.dept, new Map());
    const m = vote.get(p.dept);
    m.set(majo, (m.get(majo) || 0) + 1);
  }

  // RECOUVREMENT TERRITORIAL — critère PRINCIPAL, ajouté parce que le vote du voisinage rate les graphies
  // RÉPANDUES : les 893 fiches « Lower Saxony » forment leurs propres grappes, donc leurs voisins portent la
  // même graphie qu elles et personne ne vote contre. Deux étiquettes qui occupent LES MÊMES CASES du globe
  // désignent le même territoire, qu elles soient rares ou non.
  const casesDe = new Map();
  for(const p of pts){
    const k = Math.floor(p.lat * 4) + '|' + Math.floor(p.lon * 4);
    if(!casesDe.has(p.dept)) casesDe.set(p.dept, new Set());
    casesDe.get(p.dept).add(k);
  }
  const recouvre = new Map();   // A -> B, quand les cases de A sont contenues dans celles de B
  for(const [A, ca] of casesDe){
    const nA = compteEtiquette.get(A);
    let B = null, best = 0;
    for(const [Z, cz] of casesDe){
      if(Z === A) continue;
      if((compteEtiquette.get(Z) || 0) < nA * FACTEUR) continue;
      let n = 0; for(const k of ca) if(cz.has(k)) n++;
      const part = n / ca.size;
      if(part > best){ best = part; B = Z; }
    }
    if(B && best >= 0.5) recouvre.set(A, { vers: B, part: +best.toFixed(3) });
  }
  const trouves = [];
  for(const [A, m] of vote){
    const nA = juges.get(A) || 0;
    if(!nA) continue;
    let B = null, best = 0;
    for(const [k, v] of m) if(v > best){ best = v; B = k; }
    const part = best / nA;
    if(part < PART_MIN) continue;
    const totalA = compteEtiquette.get(A), totalB = compteEtiquette.get(B) || 0;
    if(totalB < totalA * FACTEUR) continue;
    trouves.push({ cc, de: A, vers: B, fiches: totalA, fichesCible: totalB, part: +part.toFixed(3), juges: nA });
  }
  for(const [A, r] of recouvre){
    if(trouves.some(x => x.de === A)) continue;
    trouves.push({ cc, de: A, vers: r.vers, fiches: compteEtiquette.get(A), fichesCible: compteEtiquette.get(r.vers),
      part: r.part, juges: 0, via: 'recouvrement' });
  }
  trouves.forEach(x => { if(!x.via) x.via = 'voisinage'; });
  trouves.sort((a, b) => b.fiches - a.fiches);
  if(trouves.length){
    console.log(cc + ' — ' + compteEtiquette.size + ' étiquettes, ' + trouves.length + ' graphie(s) minoritaire(s) :');
    trouves.forEach(x => console.log('    ' + String(x.fiches).padStart(6) + ' × « ' + x.de + ' »  ->  '
      + String(x.fichesCible).padStart(6) + ' × « ' + x.vers + ' »   (' + Math.round(x.part * 100) + ' % — ' + x.via + ')'));
    SORTIE.push(...trouves);
  }
}
console.log('\nTOTAL : ' + SORTIE.length + ' étiquette(s) minoritaire(s) dans ' + new Set(SORTIE.map(x => x.cc)).size + ' pays'
  + ' — ' + SORTIE.reduce((s, x) => s + x.fiches, 0) + ' fiches concernées');
if(process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(SORTIE, null, 1));
