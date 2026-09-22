// FRANCE — lieux GeoNames qui manquent à la liste officielle des communes (22/09/2026).
//
// POURQUOI. La France est le seul pays du projet dont les lieux ne viennent PAS de GeoNames : `public/data/
// communes.txt` reprend la liste officielle des 34 964 communes (geo.api.gouv.fr, IGN / Etalab). C'est la bonne
// source pour les communes — code postal, code de département, nom officiel — mais elle ne contient QUE des
// communes. Tous les autres pays publient en plus les hameaux et lieux-dits du dump GeoNames.
// Mesuré : 46 654 lieux habités français du dump n'avaient aucun équivalent publié (aucune commune du même nom
// normalisé à moins de 5 km) — 3 005 avec une population, 43 649 sans. Les premiers sont pour l'essentiel des
// ANCIENNES COMMUNES fusionnées depuis 2016 dans une « commune nouvelle » : Vire (14 603 habitants, aujourd'hui
// Vire Normandie), Verneuil-sur-Avre (7 229, Verneuil d'Avre et d'Iton), Voves (3 041, Éole-en-Beauce),
// Villedieu-les-Poêles (3 927)… Des villes que tout le monde connaît encore sous leur nom, et qui ne se trouvaient
// pas. Les seconds sont les hameaux et lieux-dits, publiés partout ailleurs dans le monde.
// Demande de l'utilisateur (22/09/2026) : « on doit pouvoir les rechercher quand même si on les connaît ».
//
// CE QUE CE SCRIPT NE FAIT PAS. Il ne retouche AUCUNE ligne IGN : elles sont recopiées telles quelles, dans leur
// ordre, avec leur code postal et leur département. Il n'invente aucun code postal (le fichier postal GeoNames
// français n'est pas dans le dépôt, et de toute façon un lieu-dit n'en a pas en propre) : la colonne « code » des
// lignes ajoutées est VIDE, comme pour les 97 728 lieux sans code publiés la veille.
//
// DÉPARTEMENT. La colonne 4 de communes.txt porte le code de département à deux chiffres (« 01 », « 2A », « 974 »).
// Un lieu ajouté reprend celui de la commune publiée la plus proche : à ces distances (40 574 des 46 654 sont à
// moins de 3 km d'une commune) le département ne fait aucun doute. Un lieu sans aucune commune à moins de 30 km
// n'est pas publié — il serait hors de France, ou mal placé.
//
// RELANCE. Le script est IDEMPOTENT : il repart des lignes IGN du fichier publié (celles qui ont un code postal),
// jette les lignes ajoutées par une exécution précédente (code vide) et les recalcule. Il peut donc être relancé
// sans que le fichier enfle, et sans la source IGN — qui n'est pas dans le dépôt.
'use strict';
const fs = require('fs');
const path = require('path');
const { excludePlace, preparePlaceName, dropNearDuplicates } = require('./communes-corrections.js');
const { normalizeCityName } = require('../lib/trip-engine.js').internals;

const KEEP_FEATURE_CODES = new Set(['PPL','PPLA','PPLA2','PPLA3','PPLA4','PPLA5','PPLC','PPLF','PPLG','PPLL','PPLS']);
const MEME_NOM_KM = 5;      // même nom à moins de 5 km : c'est la commune déjà publiée, pas un lieu de plus
const DEPT_MAX_KM = 30;     // aucune commune à moins de 30 km : on ne devine pas le département, on n'ajoute pas

function haversineKm(lat1, lon1, lat2, lon2){
  const r = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * r / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin((lon2 - lon1) * r / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

const fichier = path.join(__dirname, '..', 'public', 'data', 'communes.txt');
const publié = fs.readFileSync(fichier, 'utf8').split('\n').filter(Boolean);
// Lignes IGN = celles qui portent un code postal. Les lignes ajoutées par une exécution précédente (code vide)
// sont écartées et recalculées.
const ign = publié.filter(l => (l.split(';')[2] || '') !== '');
const ajoutéesAvant = publié.length - ign.length;

const parNom = new Map();
const grille = new Map();
const cellule = (lat, lon) => Math.round(lat * 10) + '_' + Math.round(lon * 10);
for(const l of ign){
  const ch = l.split(';'), ll = ch[1].split(',');
  const o = { lat: +ll[1], lon: +ll[0], dept: ch[3] };
  const k = normalizeCityName(ch.slice(4).join(';'));
  let g = parNom.get(k); if(!g) parNom.set(k, g = []);
  g.push(o);
  const c = cellule(o.lat, o.lon);
  let h = grille.get(c); if(!h) grille.set(c, h = []); h.push(o);
}
function communeLaPlusProche(lat, lon){
  let best = null, bd = Infinity;
  const a = Math.round(lat * 10), b = Math.round(lon * 10);
  for(let i = -3; i <= 3; i++) for(let j = -3; j <= 3; j++)
    for(const o of (grille.get((a + i) + '_' + (b + j)) || [])){
      const d = haversineKm(lat, lon, o.lat, o.lon);
      if(d < bd){ bd = d; best = o; }
    }
  return bd <= DEPT_MAX_KM ? best : null;
}

const dump = fs.readFileSync(path.join(__dirname, 'dump', 'FR_dump.txt'), 'utf8');
let bruts = 0, déjàPubliés = 0, sansDépartement = 0;
const ajouts = [];
for(const ligne of dump.split('\n')){
  if(!ligne) continue;
  const c = ligne.split('\t');
  if(!KEEP_FEATURE_CODES.has(c[7])) continue;
  const lat = parseFloat(c[4]), lon = parseFloat(c[5]);
  if(!isFinite(lat) || !isFinite(lon)) continue;
  const nom = preparePlaceName('FR', c[0], c[1]);
  if(!nom) continue;
  if(excludePlace('FR', c[0], nom, lat, lon)) continue;
  bruts++;
  const mêmes = parNom.get(normalizeCityName(nom)) || [];
  if(mêmes.some(o => haversineKm(lat, lon, o.lat, o.lon) <= MEME_NOM_KM)){ déjàPubliés++; continue; }
  const dep = communeLaPlusProche(lat, lon);
  if(!dep){ sansDépartement++; continue; }
  ajouts.push(`${parseInt(c[14], 10) || 0};${lon.toFixed(4)},${lat.toFixed(4)};;${dep.dept};${nom}`);
}
ajouts.sort((a, b) => {
  const x = a.split(';').slice(4).join(';'), y = b.split(';').slice(4).join(';');
  return x < y ? -1 : x > y ? 1 : 0;
});

const lignes = dropNearDuplicates(ign.concat(ajouts));
fs.writeFileSync(fichier, lignes.join('\n') + '\n', 'utf8');
console.log('FR : ' + ign.length + ' communes IGN (inchangées) + ' + ajouts.length + ' lieux GeoNames ajoutés' +
  (ajoutéesAvant ? ' (' + ajoutéesAvant + ' ajouts d\'une exécution précédente remplacés)' : '') +
  ' -> ' + lignes.length + ' lignes après dédoublonnage.');
console.log('   ' + bruts + ' lieux habités dans le dump, ' + déjàPubliés + ' déjà publiés sous le même nom à moins de ' +
  MEME_NOM_KM + ' km, ' + sansDépartement + ' sans commune à moins de ' + DEPT_MAX_KM + ' km (non publiés).');
