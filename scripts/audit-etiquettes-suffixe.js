'use strict';
// UNE MÊME RÉGION ÉCRITE DEUX FOIS : suffixe administratif, ou terminaison grammaticale.
//
// TROISIÈME famille, après audit-etiquettes-doubles.js (deux noms sans rapport, tranché par la carte) et
// audit-etiquettes-orthographe.js (le même nom à la casse et aux accents près). Celle-ci se reconnaît à ce que les
// deux étiquettes partagent leur TRONC et ne diffèrent que par ce qui l'habille : « Bomet » et « Bomet County »,
// « Atlántida » et « Atlántida Department », « Aizkraukles nov. » et « Aizkraukle Municipality », « Odeska » et
// « Odesa ». Le crible des graphies ne les voit pas — les deux formes n'ont pas la même terminaison — et celui des
// doublons spatiaux les écarte, leurs territoires se recouvrant trop bien pour ses seuils.
//
// D'OÙ VIENT LE DÉFAUT. Le générateur puise le nom de région à DEUX sources : admin_name1 du fichier postal et
// admin1CodesASCII du dump. Les deux nomment la même région, mais pas de la même façon, et celle qui l'emporte
// dépend de la présence d'un point postal à moins de 15 km. Un même pays publie donc les deux.
//
// MESURÉ le 25/09/2026 : 92 régions dans 7 pays — Kenya 38, Roumanie 19, Honduras 17, Ukraine 11, Lettonie 4,
// Azerbaïdjan 2, Bermudes 1.
//
// UN PREMIER JET APPARIAIT LES NOMS PAR LE CODE de division, en comparant les deux sources. Il fabriquait 95 couples
// FAUX sur 211, parce que les deux codes ne désignent pas la même chose partout : en Thaïlande le fichier postal
// numérote les provinces comme les codes postaux (51 = Lamphun) et le dump autrement (TH.51 = Suphan Buri), si bien
// que l'outil rapprochait deux provinces sans aucun rapport. Il ne lit donc plus que la DONNÉE PUBLIÉE, et n'apparie
// que sur le nom — ce qui a l'avantage de valoir aussi pour les pays sans fichier postal.
//
// CONTRÔLE, sans aucune source extérieure, le même que le crible des graphies : les deux étiquettes doivent occuper
// le même territoire, mesuré par la distance MÉDIANE d'un lieu de la forme minoritaire au lieu le plus proche de la
// forme majoritaire. Deux régions réellement distinctes sont signalées sans être corrigées.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
const E = require(ROOT + 'lib/trip-engine.js');
const parse = E.internals.parseCommunesFile;

// Même seuil et même mesure que le crible des graphies, pour la même raison : d'une forme à l'autre de la MÊME
// région la médiane va de 4 à 141 km sur les 92 couples trouvés, alors qu'entre deux régions homonymes distinctes
// (Håbo et Habo en Suède) elle vaut 246 km.
const DISTANCE_MAX_KM = 150;

// « CITY » ET « TOWN » N'EN FONT PAS PARTIE, et les Bermudes disent pourquoi : elles publient « Hamilton city »
// (la CAPITALE, code HM 08, 902 habitants) ET « Hamilton » (la PAROISSE, code FL 01, 5 862 habitants), à 5 km l'une
// de l'autre — et la ville n'est même pas dans cette paroisse, mais dans celle de Pembroke. Le mot « city » ne
// décore pas le nom, il DISTINGUE deux entités homonymes. Les fondre rangerait la capitale dans une paroisse où
// elle n'est pas. Même chose pour « Saint George » (la ville) et « Saint Georgeʼs » (la paroisse).
// MOTS QUI N'AJOUTENT RIEN AU NOM. Chacun est un mot ENTIER en fin (ou en tête) d'étiquette, jamais un morceau de
// mot : « City » retiré de « Kansas City » n'est pas le même geste que retiré de « Hamilton city ». On ne retire
// donc que sur limite de mot, et le tronc nu doit rester assez long pour désigner quelque chose.
const HABILLAGE = [
  'county', 'counties', 'department', 'departamento', 'depto', 'dept', 'division', 'municipality', 'municipio',
  'district', 'districts', 'region', 'regiunea', 'province', 'provincia', 'provincie', 'prefecture', 'governorate',
  'oblast', 'oblasti', 'voblasc', 'voblasts', 'raion', 'rajons', 'novads', 'nov', 'judetul', 'judet',
  'comarca', 'canton', 'parish', 'state', 'territory', 'autonomous'
];
const LETTRES = { 'ø': 'o', 'æ': 'ae', 'å': 'a', 'ß': 'ss', 'đ': 'd', 'ð': 'd', 'ł': 'l', 'þ': 'th', 'ħ': 'h', 'ı': 'i' };
// Deux normalisations : MOTS garde les limites de mot pour retirer l'habillage, SERRE les supprime pour comparer.
const mots = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[à-ɏ]/g, c => LETTRES[c] || c).replace(/[^a-z0-9]+/g, ' ').trim();
const serre = s => mots(s).replace(/ /g, '');
function tronc(s){
  let t = mots(s).split(' ').filter(Boolean);
  let bouge = true;
  while(bouge && t.length > 1){
    bouge = false;
    if(HABILLAGE.includes(t[t.length - 1])){ t.pop(); bouge = true; }
    else if(HABILLAGE.includes(t[0])){ t.shift(); bouge = true; }
    else if(t[0] === 'the'){ t.shift(); bouge = true; }
  }
  return t.join('');
}
// PARENTÉ DES TERMINAISONS, pour les langues où le nom de région est un ADJECTIF : « Odeska » est la forme
// adjectivale d'« Odesa », « Mykolaivska » de « Mykolaiv », « Zakarpatska » de « Zakarpattia ». On exige un tronc
// commun d'au moins quatre lettres et au plus trois lettres de reste de chaque côté — « Kisumu » et « Kisii » ne
// partagent que trois lettres, et sont bien deux comtés kényans distincts.
function terminaison(a, b){
  let i = 0;
  while(i < a.length && i < b.length && a[i] === b[i]) i++;
  return i >= 4 && (a.length - i) <= 3 && (b.length - i) <= 3 && a !== b;
}

const R = 6371, rad = v => v * Math.PI / 180;
function km(a, b){
  const dLa = rad(b.lat - a.lat), dLo = rad(b.lon - a.lon);
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

let ARGS = process.argv.slice(2).filter(x => x.charAt(0) !== '-');
if(!ARGS.length){
  ARGS = fs.readdirSync(path.join(ROOT, 'public', 'data'))
    .filter(f => /^communes-[a-z][a-z]\.txt$/.test(f))
    .map(f => f.slice(9, 11).toUpperCase());
  ARGS.push('FR');
}

const SORTIE = [], SEPAREES = [], AVERIFIER = [];
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
  // On ne rapproche que des étiquettes DIFFÉRENTES même une fois serrées : ce qui ne diffère que par la casse ou
  // les accents relève d'audit-etiquettes-orthographe.js, et serait compté deux fois.
  const formes = [...compte.keys()];
  const trouves = [];
  for(let i = 0; i < formes.length; i++){
    for(let j = i + 1; j < formes.length; j++){
      const a = formes[i], b = formes[j];
      if(serre(a) === serre(b)) continue;
      const ta = tronc(a), tb = tronc(b);
      if(!ta || !tb || ta.length < 3 || tb.length < 3) continue;
      const parSuffixe = ta === tb;
      const parTerminaison = !parSuffixe && terminaison(ta, tb);
      if(!parSuffixe && !parTerminaison) continue;
      const [majo, mino] = compte.get(a) >= compte.get(b) ? [a, b] : [b, a];
      const A = lieux.get(mino), B = lieux.get(majo);
      const d = A.map(p => Math.min.apply(null, B.map(q => km(p, q)))).sort((x, y) => x - y);
      const mediane = d[Math.floor(d.length / 2)];
      const ligne = { cc, de: mino, vers: majo, fiches: compte.get(mino), fichesCible: compte.get(majo),
        medianeKm: +mediane.toFixed(1), motif: parSuffixe ? 'habillage administratif' : 'terminaison' };
      if(mediane <= DISTANCE_MAX_KM) trouves.push(ligne); else SEPAREES.push(ligne);
    }
  }
  const habillage = trouves.filter(x => x.motif === 'habillage administratif');
  const termin = trouves.filter(x => x.motif !== 'habillage administratif');
  if(habillage.length){
    console.log(cc + ' — ' + compte.size + ' étiquettes, ' + habillage.length + ' région(s) sous deux noms :');
    habillage.sort((a, b) => b.fiches - a.fiches).forEach(x => console.log('    ' + String(x.fiches).padStart(5)
      + ' × « ' + x.de + ' »  ->  ' + String(x.fichesCible).padStart(5) + ' × « ' + x.vers + ' »   (habillage '
      + 'administratif, plus proche à ' + x.medianeKm + ' km)'));
    SORTIE.push(...habillage);
  }
  if(termin.length) AVERIFIER.push(...termin);
}
console.log('\nTOTAL : ' + SORTIE.length + ' région(s) sous deux noms dans ' + new Set(SORTIE.map(x => x.cc)).size
  + ' pays — ' + SORTIE.reduce((s, x) => s + x.fiches, 0) + ' fiches à renommer');
// PARENTÉ DE TERMINAISON : signalée, JAMAIS proposée. Ce que la terminaison rapproche n'est pas toujours une
// graphie : c'est souvent un ÉCHELON (le pagasts letton dans son novads, l'oblast ukrainien contre le raïon qui
// porte le même nom), et parfois deux régions bel et bien distinctes — « Ağdaş » et « Ağdam » sont deux raions
// d'Azerbaïdjan séparés de 52 km, « Xocalı » et « Xocavənd » deux autres. Aucune de ces paires ne peut être fondue
// sans être examinée une par une.
if(AVERIFIER.length){
  console.log('\nÀ EXAMINER UNE PAR UNE (troncs parents par la TERMINAISON : peut-être deux échelons, peut-être deux '
    + 'régions distinctes) : ' + AVERIFIER.length);
  AVERIFIER.sort((a, b) => b.fiches - a.fiches).forEach(x => console.log('    ' + x.cc + '  ' + x.fiches + ' × « '
    + x.de + ' » et ' + x.fichesCible + ' × « ' + x.vers + ' » — ' + x.medianeKm + ' km en médiane'));
}
if(SEPAREES.length){
  console.log('SIGNALÉES SANS ÊTRE CORRIGÉES (troncs parents, territoires SÉPARÉS : peut-être deux régions bien '
    + 'distinctes) : ' + SEPAREES.length);
  SEPAREES.forEach(x => console.log('    ' + x.cc + '  « ' + x.de + ' » (' + x.fiches + ') et « ' + x.vers
    + ' » (' + x.fichesCible + ') — ' + x.medianeKm + ' km en médiane, ' + x.motif));
}
if(process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify({ aCorriger: SORTIE, aVerifier: AVERIFIER, separees: SEPAREES }, null, 1));
