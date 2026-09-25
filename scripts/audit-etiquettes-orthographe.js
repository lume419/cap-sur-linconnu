'use strict';
// UNE MÊME RÉGION ÉCRITE DEUX FOIS : casse, accents ou ponctuation seulement.
//
// Famille de défauts distincte de celle d'audit-etiquettes-doubles.js, et beaucoup plus sûre à établir. Là, deux
// NOMS DIFFÉRENTS désignaient peut-être le même territoire, ce que seule la carte pouvait trancher — et elle a
// montré que le critère spatial se trompait souvent (deux paroisses d'Andorre, deux émirats). Ici les deux
// étiquettes sont LE MÊME NOM, à la casse et aux accents près : « msila » et « M'Sila » ne peuvent pas être deux
// wilayas d'Algérie.
//
// MESURÉ le 25/09/2026 : 40 paires en Algérie, 1 en Roumanie. Le crible spatial n'en voyait que 11, ses seuils
// (recouvrement, rapport de 3) écartant les paires trop petites ou trop entremêlées — d'où cet outil dédié.
//
// CONTRÔLE, sans aucune source extérieure : les deux étiquettes doivent occuper LES MÊMES CASES du globe. Deux
// régions homonymes réellement distinctes — cela existe — seraient séparées géographiquement, et sont alors
// SIGNALÉES sans être corrigées. La graphie retenue est la MAJORITAIRE.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
const E = require(ROOT + 'lib/trip-engine.js');
const parse = E.internals.parseCommunesFile;

// MESURÉ le 25/09/2026, et c'est ce qui sépare les deux familles : d'une graphie minoritaire à la graphie
// majoritaire de la MÊME région, la distance médiane au lieu le plus proche va de 11 à 38 km (98 km pour
// Illizi, wilaya saharienne de cinq lieux) ; entre les communes suédoises HOMONYMES Håbo et Habo, qui sont bel
// et bien distinctes, elle vaut 246 km. Le recouvrement de CASES, essayé d'abord, écartait à tort les wilayas
// immenses dont les lieux sont dispersés : 14 % de cases partagées pour « adrar » et « Adrar ».
const DISTANCE_MAX_KM = 150;

// TRANSLITTÉRATION plutôt que suppression. Un premier jet retirait tout caractère hors [a-z0-9] : « Tromsø »
// devenait « troms » et se confondait avec le COMTÉ de Troms, qui est une autre entité. Les lettres qui ne se
// décomposent pas en NFD sont donc rendues par leur équivalent latin.
// DIFFÉRENCE CERTAINE contre différence à vérifier, et c'est le cœur du crible. « illizi » et « Illizi » ne
// diffèrent QUE PAR LA CASSE : aucune langue n'en fait deux mots, ce sont forcément deux écritures de la même
// wilaya, et le contrôle spatial est inutile. « Håbo » et « Habo » diffèrent par un DIACRITIQUE, et en suédois
// le å est une lettre à part entière : ce sont deux communes bien distinctes, à 246 km l'une de l'autre.
// Le contrôle spatial n'est donc exigé que pour les différences de diacritique — sans quoi il écartait à tort
// « illizi » et « ouargla », dont les quelques lieux sont dispersés sur des wilayas sahariennes immenses.
// CERTAIN = ne diffère que par la CASSE et les espaces de tête, de fin ou répétées. Un premier jet retirait
// TOUTE la ponctuation, espaces internes comprises : il déclarait certaines « Monte Negro » et « Montenegro »,
// qui sont deux communes brésiliennes distinctes à 2 500 km l'une de l'autre. Retirer une espace ne change pas
// l'écriture d'un mot, cela en fait un autre — ce cas passe donc par le contrôle de distance comme les autres.
const espaces = s => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
const casseSeule = (a, b) => a !== b && espaces(a) === espaces(b);

const LETTRES = { 'ø': 'o', 'æ': 'ae', 'å': 'a', 'ß': 'ss', 'đ': 'd', 'ð': 'd', 'ł': 'l', 'þ': 'th', 'ħ': 'h', 'ı': 'i' };
const ortho = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[\u00e0-\u024f]/g, c => LETTRES[c] || c).replace(/[^a-z0-9]+/g, '');

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

const SORTIE = [], SEPAREES = [];
for(const spec of ARGS){
  const cc = spec.toUpperCase();
  const f = cc === 'FR' ? 'communes.txt' : 'communes-' + cc.toLowerCase() + '.txt';
  let l;
  try { l = parse(fs.readFileSync(path.join(ROOT, 'public', 'data', f), 'utf8'), cc); }
  catch(e){ continue; }
  const pts = l.filter(x => isFinite(x.lat) && isFinite(x.lon) && String(x.dept || '').length > 0);
  if(!pts.length) continue;

  const compte = new Map(), lieux = new Map();
  for(const p of pts){
    compte.set(p.dept, (compte.get(p.dept) || 0) + 1);
    if(!lieux.has(p.dept)) lieux.set(p.dept, []);
    lieux.get(p.dept).push(p);
  }
  const groupes = new Map();
  for(const e of compte.keys()){
    const k = ortho(e);
    if(!k) continue;
    if(!groupes.has(k)) groupes.set(k, []);
    groupes.get(k).push(e);
  }
  const trouves = [];
  for(const [, formes] of groupes){
    if(formes.length < 2) continue;
    formes.sort((a, b) => compte.get(b) - compte.get(a));
    const majo = formes[0];
    for(const mino of formes.slice(1)){
      const A = lieux.get(mino), B = lieux.get(majo);
      const d = A.map(p => Math.min.apply(null, B.map(q => km(p, q)))).sort((x, y) => x - y);
      const mediane = d[Math.floor(d.length / 2)];
      const ligne = { cc, de: mino, vers: majo, fiches: compte.get(mino), fichesCible: compte.get(majo),
        medianeKm: +mediane.toFixed(1) };
      ligne.certaine = casseSeule(mino, majo);
      if(ligne.certaine || mediane <= DISTANCE_MAX_KM) trouves.push(ligne); else SEPAREES.push(ligne);
    }
  }
  if(trouves.length){
    console.log(cc + ' — ' + compte.size + ' étiquettes, ' + trouves.length + ' graphie(s) en double :');
    trouves.sort((a, b) => b.fiches - a.fiches).forEach(x => console.log('    ' + String(x.fiches).padStart(5)
      + ' × « ' + x.de + ' »  ->  ' + String(x.fichesCible).padStart(5) + ' × « ' + x.vers + ' »'
      + (x.certaine ? '   (casse ou ponctuation seule : certain)' : '   (diacritique, plus proche à ' + x.medianeKm + ' km)')));
    SORTIE.push(...trouves);
  }
}
console.log('\nTOTAL : ' + SORTIE.length + ' graphie(s) en double dans ' + new Set(SORTIE.map(x => x.cc)).size
  + ' pays — ' + SORTIE.reduce((s, x) => s + x.fiches, 0) + ' fiches');
if(SEPAREES.length){
  console.log('SIGNALÉES SANS ÊTRE CORRIGÉES (même nom, territoires SÉPARÉS : peut-être deux régions homonymes) : '
    + SEPAREES.length);
  SEPAREES.forEach(x => console.log('    ' + x.cc + '  « ' + x.de + ' » (' + x.fiches + ') et « ' + x.vers
    + ' » (' + x.fichesCible + ') — ' + x.medianeKm + ' km en médiane'));
}
if(process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify({ aCorriger: SORTIE, separees: SEPAREES }, null, 1));
