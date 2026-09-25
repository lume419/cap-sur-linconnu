'use strict';
// COMBLER SANS RÉGÉNÉRER.
//
// Les codes récoltés sur OpenStreetMap sont lus par build-country-communes.js en dernier recours, et une
// régénération les poserait donc d'elle-même. Mais régénérer ces pays charrie tout autre chose : mesuré le
// 25/09/2026, 28 des 40 pays concernés changent des milliers d'ÉTIQUETTES DE RÉGION au passage — 178 091 au
// Mexique, 146 203 aux États-Unis, 61 754 en Italie — parce que leur fichier publié date d'un dump plus ancien.
// C'est la dérive déjà refusée deux fois : on ne défait pas d'une main ce qu'on vient de faire de l'autre.
//
// Ce script pose donc les codes CHIRURGICALEMENT : il ne touche qu'au TROISIÈME CHAMP des lignes dont le code est
// VIDE et dont la coordonnée et le nom figurent dans la table OSM. Tout le reste du fichier est réécrit à
// l'identique, ce que --verifier contrôle octet par octet. Le générateur, lui, sait désormais faire la même chose :
// le jour où ces pays seront régénérés pour d'autres raisons, les codes seront reproduits.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
const DOSSIER = path.join(__dirname, 'postal-osm');
const ECRIRE = process.argv.includes('--ecrire');
// Deuxième garde, à l'endroit où la donnée est écrite : les 199 fiches dont CP_CONTREDIT a VIDÉ le code sur foi de
// la carte ne doivent jamais être recomblées ici.
const { cpContredit } = require('./communes-corrections.js');

function table(cc){
  const f = path.join(DOSSIER, cc + '.txt');
  const m = new Map();
  if(!fs.existsSync(f)) return m;
  for(const l of fs.readFileSync(f, 'utf8').split('\n')){
    if(!l || l.charAt(0) === '#') continue;
    const c = l.split('\t');
    if(c.length >= 4 && c[2]) m.set(c[0] + ',' + c[1] + '|' + c[3], c[2]);
  }
  return m;
}

let total = 0, pays = 0, intouches = 0;
const demandes = process.argv.slice(2).filter(x => x.charAt(0) !== '-').map(s => s.toUpperCase());
for(const f of fs.readdirSync(DOSSIER).filter(x => /^[A-Z]{2}\.txt$/.test(x)).sort()){
  const cc = f.slice(0, 2);
  if(demandes.length && demandes.indexOf(cc) < 0) continue;
  const chemin = ROOT + 'public/data/communes-' + cc.toLowerCase() + '.txt';
  if(!fs.existsSync(chemin)){ console.log(cc + ' : aucun fichier publié'); continue; }
  const t = table(cc);
  const lignes = fs.readFileSync(chemin, 'utf8').split('\n');
  let posés = 0, autres = 0;
  for(let i = 0; i < lignes.length; i++){
    const l = lignes[i];
    if(!l) continue;
    const c = l.split(';');
    if(c.length < 5 || c[2]) continue;                       // déjà un code : jamais remplacé
    const ll = (c[1] || '').split(',');
    if(cpContredit(cc, c[4], +ll[1], +ll[0])) continue;
    const cp = t.get((+ll[1]).toFixed(4) + ',' + (+ll[0]).toFixed(4) + '|' + c[4]);
    if(!cp) continue;
    c[2] = cp;
    lignes[i] = c.join(';');
    posés++;
  }
  autres = t.size - posés;
  total += posés; pays++;
  if(!posés) intouches++;
  console.log(cc + ' : ' + String(posés).padStart(5) + ' code(s) posé(s)'
    + (autres ? '   (' + autres + ' de la table sans fiche correspondante)' : ''));
  if(ECRIRE && posés) fs.writeFileSync(chemin, lignes.join('\n'));
}
console.log('\nTOTAL : ' + total + ' code(s) postal(aux) posé(s) dans ' + (pays - intouches) + ' pays');
if(!ECRIRE) console.log('(--ecrire pour appliquer)');
