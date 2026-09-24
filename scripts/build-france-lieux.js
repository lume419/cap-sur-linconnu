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
// ordre, avec leur code postal et leur département. Il n'invente aucun code postal.
//
// RATTACHEMENT (23/09/2026). « Les lieux-dits sont généralement rattachés à des villes environnantes, ex : "le
// marchais vert" est rattaché à Beauchêne » (utilisateur). C'est exact, et la source le dit : la colonne admin4 du
// dump porte le CODE INSEE de la commune dont le lieu dépend. Un lieu rattaché reçoit donc les CODES POSTAUX de sa
// commune — c'est par eux que le courrier lui parvient, rien n'est inventé — et le NOM de cette commune dans un
// 6e champ, affiché dans la suggestion (« Belzaises · Saint-Sulpice-sur-Risle », « A Castagnola · Alata »).
// L'exemple donné par l'utilisateur, « Le Marchais Vert », ne figure PAS dans GeoNames (22 « Marchais » y sont, pas
// celui-là) : il n'a jamais pu être publié. Les exemples de ce fichier sont pris dans les données réelles.
// 39 955 des 46 467 lieux ajoutés sont ainsi rattachés. Les 6 512 autres dépendent d'une commune qui a ELLE-MÊME
// fusionné depuis et ne figure plus dans la liste officielle (Beauchêne est passée dans Tinchebray-Bocage en 2015) :
// faute de table des fusions dans le dépôt, ils restent sans code et sans rattachement, plutôt que d'être rattachés
// à une commune devinée — le voisin le plus proche s'est déjà montré mauvais juge (voir DÉPARTEMENT ci-dessous).
// Une commune à plusieurs codes postaux les transmet TOUS : on ne sait pas lequel des vingt codes de Paris sert le
// 18e arrondissement, la liste complète est donc publiée et l'un quelconque le retrouve.
//
// DÉPARTEMENT. La colonne 4 de communes.txt porte le code de département à deux chiffres (« 01 », « 2A », « 974 »).
// Il est lu dans la SOURCE : la colonne admin2 du dump GeoNames porte exactement ce code, et son vocabulaire coïncide
// avec celui de l'IGN — 79 045 lieux habités sur 80 290 en portent un, et pas un seul code inconnu.
// La première version de ce script (22/09/2026) reprenait à la place le département de la commune publiée la plus
// proche. C'ÉTAIT FAUX là où les communes sont petites et le département dense : mesuré en production, **neuf des vingt
// arrondissements de Paris** se retrouvaient en Seine-Saint-Denis, dans les Hauts-de-Seine ou le Val-de-Marne, parce
// que Paris est UNE commune de 105 km² dont le centre est à 4 km du 18e, quand Saint-Ouen est à 2 km. Le voisin le plus
// proche n'est pas le bon juge quand les communes n'ont pas la même taille.
// Les 1 245 lieux dont la source ne donne pas de département gardent l'ancienne règle, faute de mieux : celui de la
// commune publiée la plus proche (40 574 des 46 654 sont à moins de 3 km d'une commune).
// Un lieu sans aucune commune à moins de 30 km n'est pas publié — il serait hors de France, ou mal placé.
//
// RELANCE. Le script est IDEMPOTENT : il repart des lignes IGN du fichier publié (celles qui ont un code postal),
// jette les lignes ajoutées par une exécution précédente (code vide) et les recalcule. Il peut donc être relancé
// sans que le fichier enfle, et sans la source IGN — qui n'est pas dans le dépôt.
'use strict';
const fs = require('fs');
const path = require('path');
const { excludePlace, preparePlaceName, dropNearDuplicates, fixIgnCoord } = require('./communes-corrections.js');
const { normalizeCityName } = require('../lib/trip-engine.js').internals;

const KEEP_FEATURE_CODES = new Set(['PPL','PPLA','PPLA2','PPLA3','PPLA4','PPLA5','PPLC','PPLF','PPLG','PPLL','PPLS']);
const MEME_NOM_KM = 5;      // même nom à moins de 5 km, où que ce soit : c'est la commune déjà publiée
// Même nom ET MÊME DÉPARTEMENT : c'est la commune, pas un lieu de plus — les noms de communes sont UNIQUES dans un
// département (vérifié : 0 doublon sur les 34 964 lignes IGN publiées). Deux seuils, parce qu'une commune n'est pas un
// point : le centre publié par l'IGN est le centre de la SURFACE, qui peut être loin du village. Arles (759 km², la
// plus vaste de France) était ainsi publiée deux fois, à 14,7 km d'écart, avec deux populations différentes
// (51 811 et 53 431) ; Aix-en-Provence aussi, à 5 km (146 821 et 149 695).
const MEME_DEPT_KM = 15;    // même nom, même département, moins de 15 km : la commune, quelle que soit la population
// Au-delà, la population tranche : GeoNames ne donne pas de population à un hameau. Un lieu qui en porte une ET qui
// porte le nom d'une commune de son département EST cette commune, même à 60 km — les autres (281 à plus de 40 km,
// tous à population nulle) sont de vrais lieux-dits homonymes, qu'il faut garder.
const DEPT_MAX_KM = 30;     // aucune commune à moins de 30 km : on ne devine pas le département, on n'ajoute pas

function haversineKm(lat1, lon1, lat2, lon2){
  const r = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * r / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin((lon2 - lon1) * r / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

const fichier = path.join(__dirname, '..', 'public', 'data', 'communes.txt');
const publié = fs.readFileSync(fichier, 'utf8').split('\n').filter(Boolean);
// Lignes IGN = celles qui portent un code postal ET PAS de 6e champ. Les lignes ajoutées par une exécution précédente
// sont écartées et recalculées : elles se reconnaissent à leur 6e champ (la commune de rattachement), ou, pour celles
// d'avant le rattachement du 23/09/2026, à leur code postal vide.
// Le seul test « pas de code postal » ne suffit plus DEPUIS que les lieux rattachés reçoivent celui de leur commune :
// une relance les aurait pris pour des lignes IGN et les aurait gardées à jamais (mesuré : 34 964 lignes IGN devenues
// 74 914 en une relance).
const ign = publié.filter(l => { const p = l.split(';'); return p[2] !== '' && p.length < 6; });
const ajoutéesAvant = publié.length - ign.length;

// POINT OFFICIEL HORS DE L'ÎLE HABITÉE (24/09/2026) — la SEULE retouche d'une ligne IGN de tout ce script, et
// elle ne touche que les coordonnées : ni le nom, ni le code postal, ni le département. Chaque cas est décrit,
// mesuré et sourcé dans IGN_COORD_FIXES (scripts/communes-corrections.js). Aujourd'hui : Maupiti, que la source
// officielle publie sur Maupihaʻa — un atoll de sept habitants, à 236 km des 1 302 habitants de la commune.
let coordsCorrigées = 0;
for(let i = 0; i < ign.length; i++){
  const ch = ign[i].split(';');
  const fix = fixIgnCoord(ch[4], ch[3]);
  if(!fix) continue;
  ch[1] = fix.lon + ',' + fix.lat;
  ign[i] = ch.join(';');
  coordsCorrigées++;
}


const parNom = new Map();
const grille = new Map();
const cellule = (lat, lon) => Math.round(lat * 10) + '_' + Math.round(lon * 10);
for(const l of ign){
  const ch = l.split(';'), ll = ch[1].split(',');
  const o = { lat: +ll[1], lon: +ll[0], dept: ch[3], cps: ch[2], nom: ch[4] };
  const k = normalizeCityName(ch[4]);
  let g = parNom.get(k); if(!g) parNom.set(k, g = []);
  g.push(o);
  o.cle = k + '|' + ch[3];
  const c = cellule(o.lat, o.lon);
  let h = grille.get(c); if(!h) grille.set(c, h = []); h.push(o);
}
// Commune de rattachement : le dump porte, colonne admin4, le code INSEE de la commune dont le lieu-dit dépend
// (« Belzaises » -> 61456, Saint-Sulpice-sur-Risle).
//
// Ce code est traduit en nom de commune par les enregistrements ADM4 du dump, qui sont les communes elles-mêmes.
// La première version (23/09/2026) prenait à la place le premier lieu HABITÉ dont le nom correspondait à une commune
// publiée du même département. C'était faux : un hameau qui porte le nom d'une AUTRE commune du département
// détournait le code INSEE de la sienne. Mesuré : 997 lieux rattachés à la mauvaise commune, donc publiés avec le
// mauvais code postal, jusqu'à 122 km de distance — les 12 lieux de Meaulne (03360) sous « Le Vernet » (03200),
// « Cosnes » (2 110 habitants, Cosnes-et-Romain, 54400) sous « Romain » (54360), 14 lieux de Dijon sous « Larrey ».
// L'enregistrement ADM4 lève l'ambiguïté : il donne « Cosnes-et-Romain » pour 54138 et « Meaulne-Vitray » pour 03168.
//
// Correspondance STRICTE avec une commune publiée (même nom normalisé, même département). 34 727 codes INSEE sur
// 34 742 se résolvent ainsi. Les 15 restants sont des communes que GeoNames nomme en abrégé (« Louhans » pour
// Louhans-Châteaurenaud, « Éragny » pour Éragny-sur-Oise) : leurs 52 lieux ne sont pas publiés. Les rattacher
// demanderait de rapprocher deux noms qui diffèrent — exactement l'approximation qui a produit les 997 erreurs.
const parCleIgn = new Map();
for(const g of parNom.values()) for(const o of g) if(!parCleIgn.has(o.cle)) parCleIgn.set(o.cle, o);
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
// INSEE -> commune publiée, par les enregistrements ADM4 du dump : ce sont les communes elles-mêmes, pas des lieux
// habités qui s'y trouvent. Un enregistrement ADM4 porte son propre code INSEE en colonne admin4.
const communeParInsee = new Map();
for(const ligne of dump.split('\n')){
  if(!ligne) continue;
  const c = ligne.split('\t');
  if(c[7] !== 'ADM4' || !c[13]) continue;
  const co = parCleIgn.get(normalizeCityName(c[1]) + '|' + c[11]);
  if(co && !communeParInsee.has(c[13])) communeParInsee.set(c[13], co);
}
// Codes de département réellement publiés par l'IGN : le seul vocabulaire accepté pour la colonne admin2 du dump.
const DEPTS_IGN = new Set(ign.map(l => l.split(';')[3]));
let bruts = 0, déjàPubliés = 0, sansDépartement = 0, depSource = 0, depVoisin = 0, rattachés = 0, orphelins = 0;
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
  const pop = parseInt(c[14], 10) || 0;
  const deptSource = DEPTS_IGN.has(c[11]) ? c[11] : null;
  const mêmes = parNom.get(normalizeCityName(nom)) || [];
  const déjàLà = mêmes.some(o => {
    const d = haversineKm(lat, lon, o.lat, o.lon);
    if(d <= MEME_NOM_KM) return true;                                   // même nom, tout près : la commune
    if(deptSource && o.dept === deptSource) return d <= MEME_DEPT_KM || pop > 0; // même nom, même département
    return false;
  });
  if(déjàLà){ déjàPubliés++; continue; }
  // Département : celui de la source quand elle le donne ; sinon celui de la commune publiée la plus proche.
  // Dans les deux cas, un lieu sans aucune commune à moins de DEPT_MAX_KM n'est pas publié — hors de France ou mal placé.
  const voisin = communeLaPlusProche(lat, lon);
  if(!voisin){ sansDépartement++; continue; }
  let dept;
  if(deptSource){ dept = deptSource; depSource++; }
  else { dept = voisin.dept; depVoisin++; }
  // RATTACHEMENT (23/09/2026, demande de l'utilisateur : « les lieux-dits sont généralement rattachés à des villes
  // environnantes »). Un lieu-dit rattaché reçoit les CODES POSTAUX de sa commune — c'est par eux que le courrier lui
  // parvient, rien n'est inventé — et le NOM de cette commune en 6e champ, pour que la suggestion dise où c'est.
  // Sans rattachement résolu, la ligne reste comme avant : pas de code, pas de 6e champ.
  // Sans rattachement résolu, le lieu N'EST PAS PUBLIÉ (décision de l'utilisateur, 23/09/2026 : « si les lieux-dits
  // ont été absorbés à une date antérieure, ils n'existent plus et ne doivent donc plus apparaître »). Le code INSEE
  // désigne alors une commune qui a elle-même disparu, et la fiche décrit un état du territoire qui n'a plus cours :
  // d'anciennes communes absorbées (Cherbourg, Évry, Saint-Ouen, Équeurdreville-Hainneville…), mais aussi des fiches
  // qui n'ont jamais été des communes — « Dunkirk », le nom anglais de Dunkerque, et « Marne La Vallée », ville
  // nouvelle à cheval sur plusieurs communes. Aucune n'est une destination réelle aujourd'hui.
  const commune = communeParInsee.get(c[13]);
  if(!commune){ orphelins++; continue; }
  rattachés++;
  ajouts.push(`${pop};${lon.toFixed(4)},${lat.toFixed(4)};${commune.cps};${dept};${nom};${commune.nom}`);
}
ajouts.sort((a, b) => {
  const x = a.split(';')[4], y = b.split(';')[4];
  return x < y ? -1 : x > y ? 1 : 0;
});

const lignes = dropNearDuplicates(ign.concat(ajouts));
fs.writeFileSync(fichier, lignes.join('\n') + '\n', 'utf8');
console.log('FR : ' + ign.length + ' communes IGN (' + (coordsCorrigées ? coordsCorrigées + ' point(s) corrigé(s)' : 'inchangées') + ') + ' + ajouts.length + ' lieux GeoNames ajoutés' +
  (ajoutéesAvant ? ' (' + ajoutéesAvant + ' ajouts d\'une exécution précédente remplacés)' : '') +
  ' -> ' + lignes.length + ' lignes après dédoublonnage.');
console.log('   ' + bruts + ' lieux habités dans le dump, ' + déjàPubliés + ' déjà publiés (même nom à moins de ' +
  MEME_NOM_KM + ' km, ou même nom dans le même département à moins de ' + MEME_DEPT_KM + ' km ou avec une population), ' +
  sansDépartement + ' sans commune à moins de ' + DEPT_MAX_KM + ' km (non publiés).');
console.log('   rattachement : ' + rattachés + ' lieux reçoivent le code postal et le nom de leur commune (colonne admin4), ' +
  orphelins + " NON PUBLIÉS faute de rattachement : leur commune a elle-même disparu, la fiche décrit un état du territoire qui n'a plus cours.");
console.log('   département : ' + depSource + ' lus dans la source (admin2), ' + depVoisin +
  ' déduits de la commune publiée la plus proche faute de code dans la source.');
