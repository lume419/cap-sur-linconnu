// MESURE STRICTE de la couverture de public/js/app.js.
//
// La mesure grossière compte les occurrences d'un NOM dans les fichiers de test. Elle surestime, et cette passe
// l'a prouvé : un bouchon écrit « function renderDays(){ redessins++; } » dans la colle d'un bac à sable fait
// passer renderDays pour couverte alors qu'elle n'est pas exercée du tout.
// Ici, une citation ne compte PAS si elle est la déclaration d'une doublure — c'est-à-dire une ligne de la forme
// « 'function <nom>(… » (le code du bac à sable est écrit dans des chaînes). Tout le reste compte.
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
const APP = fs.readFileSync(ROOT + 'public/js/app.js', 'utf8');
const lignes = APP.split('\n');

const testsDir = path.join(ROOT, 'tests');
const fichiers = fs.readdirSync(testsDir).filter(f => f.endsWith('.js')).map(f => path.join(testsDir, f))
  .concat(fs.readdirSync(path.join(testsDir, 'helpers')).map(f => path.join(testsDir, 'helpers', f)));

const RE = /^(\s{2})(?:function\s+([A-Za-z_$][\w$]*)\s*\(|(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\s*\(|\([^)]*\)\s*=>))/;
const noms = [];
lignes.forEach(l => { const m = l.match(RE); const n = m && (m[2] || m[3]); if(n && n.length > 3) noms.push(n); });

const couvert = {}, seulementDoublure = [];
for(const n of new Set(noms)){
  let vraies = 0, doublures = 0;
  for(const f of fichiers){
    for(const l of fs.readFileSync(f, 'utf8').split('\n')){
      if(l.indexOf(n) < 0) continue;
      // Déclaration de doublure : « 'function nom( » ou « function nom( » dans une chaîne de colle.
      const estDoublure = new RegExp("['\"`]\\s*function\\s+" + n + "\\s*\\(").test(l)
        || new RegExp("^\\s*'function\\s+" + n).test(l);
      if(estDoublure) doublures++; else vraies++;
    }
  }
  couvert[n] = vraies > 0;
  if(!vraies && doublures) seulementDoublure.push(n);
}
const total = Object.keys(couvert).length;
const nonCouvertes = Object.keys(couvert).filter(n => !couvert[n]);
console.log('fonctions de premier niveau : ' + total);
console.log('  exercées ou citées hors doublure : ' + (total - nonCouvertes.length));
console.log('  NON couvertes                    : ' + nonCouvertes.length
  + (nonCouvertes.length ? '\n    ' + nonCouvertes.join(', ') : ''));
process.exitCode = (nonCouvertes.length || seulementDoublure.length) ? 1 : 0;
console.log('  couvertes SEULEMENT par une doublure (donc non exercées) : ' + seulementDoublure.length
  + (seulementDoublure.length ? '\n    ' + seulementDoublure.join(', ') : ''));
