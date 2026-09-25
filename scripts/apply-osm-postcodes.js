'use strict';
// CE QUI EST RÉCOLTÉ N'EST PAS CE QUI EST PUBLIÉ. Ce script juge la moisson de fetch-osm-postcodes.js et n'en retient
// que ce qui tient debout, puis écrit un fichier par pays, lu par build-country-communes.js en DERNIER RECOURS —
// jamais pour remplacer un code venu du fichier postal GeoNames, seulement pour combler un vide.
//
// TROIS CRIBLES, chacun né d'un cas vu dans la moisson :
//   1. FORME. Le code doit ressembler aux autres codes du pays. La référence n'est pas une table écrite à la main
//      mais la donnée elle-même : les codes DÉJÀ publiés pour ce pays (la plupart des pays concernés sont mixtes —
//      la Bosnie a 374 fiches avec code sur 21 336), et à défaut la forme majoritaire de la moisson. Un code isolé
//      qui ne ressemble à rien est écarté : c'est le plus souvent celui d'un objet importé de travers.
//   2. DISTANCE. Nominatim rend l'objet le plus proche du point demandé ; s'il est loin, son code est celui d'un
//      voisin. La limite est fixée à 2 km — le rapprochement GeoNames en autorise quinze, et c'est précisément
//      cette largeur qui a produit les codes contredits de CP_CONTREDIT.
//   3. CORROBORATION PAR LE VOISINAGE, et c'est le crible décisif. Un code récolté doit partager son préfixe avec
//      le code GEONAMES du lieu publié le plus proche : une source indépendante de celle qui l'a fourni.
//      POURQUOI CE CRIBLE EXISTE, et pourquoi il est aussi dur. On a d'abord mesuré un TÉMOIN : à quel taux les
//      codes GeoNames déjà publiés s'accordent-ils ENTRE EUX ? Réponse, avec la règle ci-dessous : 94 % à moins de
//      5 km. La moisson OpenStreetMap, elle, n'y arrive que 58 % du temps. L'écart n'est pas un détail de méthode :
//      il dit qu'une part importante des codes rendus est celle d'un objet lointain ou d'une zone postale trop
//      large — « Tavush », village du nord-est de l'Arménie, recevait 0045, un code d'EREVAN.
//      Le crible coûte des codes justes : 6 % des voisinages GeoNames se contredisent légitimement, un village
//      pouvant relever d'un autre bureau que son voisin. On préfère perdre ceux-là qu'en publier un faux — c'est la
//      même règle que pour les prix de ferry, où un chiffre déduit est refusé au profit d'un champ vide.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
const DOSSIER = path.join(__dirname, 'postal-osm');
const CACHE = path.join(DOSSIER, 'cache.jsonl');
const DISTANCE_MAX_KM = 2;
const ECRIRE = process.argv.includes('--ecrire');
// UN CODE VIDE N'EST PAS TOUJOURS UN CODE MANQUANT. CP_CONTREDIT en vide 199 EXPRÈS : leur code était démenti par
// les coordonnées, vérifié fiche par fiche sur la carte, et l'effacer était la correction. Les recombler serait
// défaire ce travail — un premier jet l'a fait, et le test des codes démentis l'a dit aussitôt.
const { cpContredit } = require('./communes-corrections.js');

const RT = 6371, rad = v => v * Math.PI / 180;
function km(aLat, aLon, bLat, bLon){
  const h = Math.sin(rad(bLat - aLat) / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLon - aLon) / 2) ** 2;
  return 2 * RT * Math.asin(Math.sqrt(h));
}
const forme = cp => String(cp).replace(/[0-9]/g, '9').replace(/[A-Za-z]/g, 'A');

function codesPublies(cc){
  const f = ROOT + 'public/data/communes-' + cc.toLowerCase() + '.txt';
  const out = [];
  if(!fs.existsSync(f)) return out;
  for(const l of fs.readFileSync(f, 'utf8').split('\n')){
    if(!l) continue;
    const cp = l.split(';')[2];
    if(cp && !/^[A-Za-z]{2}-/.test(cp)) out.push(cp);   // un identifiant de région ISO n'est pas un code postal
  }
  return out;
}
// Les lieux publiés du pays qui portent un VRAI code postal, avec leur position : c'est le voisinage qui corrobore.
//
// UNE SOURCE NE S'ATTESTE PAS ELLE-MÊME, et c'est tout l'intérêt de ce crible : le code récolté doit s'accorder
// avec un code GEONAMES, venu d'ailleurs. Or dès le second passage, le fichier publié CONTIENT les codes déjà posés
// par cet outil — et ils se corroboraient entre eux. Mesuré : 112 codes refusés la veille étaient « corroborés »
// au passage suivant, 60 pour la seule Ukraine, sans qu'aucune donnée nouvelle ne soit venue les appuyer. Les codes
// listés dans scripts/postal-osm/ sont donc RETIRÉS du voisinage.
function voisinage(cc){
  const f = ROOT + 'public/data/communes-' + cc.toLowerCase() + '.txt';
  const out = [];
  if(!fs.existsSync(f)) return out;
  const nôtres = new Set();
  const t = path.join(DOSSIER, cc + '.txt');
  if(fs.existsSync(t)){
    for(const l of fs.readFileSync(t, 'utf8').split('\n')){
      if(!l || l.charAt(0) === '#') continue;
      const c = l.split('\t');
      if(c.length >= 4) nôtres.add(c[0] + ',' + c[1] + '|' + c[3]);
    }
  }
  for(const l of fs.readFileSync(f, 'utf8').split('\n')){
    if(!l) continue;
    const c = l.split(';');
    if(!c[2] || /^[A-Za-z]{2}-/.test(c[2])) continue;
    const ll = (c[1] || '').split(',');
    if(nôtres.has((+ll[1]).toFixed(4) + ',' + (+ll[0]).toFixed(4) + '|' + c[4])) continue;
    out.push({ lat: +ll[1], lon: +ll[0], cp: c[2].split(',')[0] });
  }
  return out;
}
// Comparaison des préfixes : on garde les LETTRES autant que les chiffres. Un premier jet ne gardait que les
// chiffres, ce qui suffisait tant qu'aucun pays retenu n'avait de code alphanumérique — vérifié, les 31 tables
// écrites le 25/09/2026 n'en contenaient aucun. L'Irlande en a fait un cas : ses codes sont des CLÉS DE ROUTAGE
// (« V95 », « A41 »), et ne comparer que les chiffres aurait déclaré « V95 » et « A95 » d'accord entre eux.
const chiffres = cp => String(cp).toUpperCase().replace(/[^0-9A-Z]/g, '');
// Longueur de préfixe comparée : la moitié des chiffres du pays, entre 2 et 3. Mesurée sur le témoin, cette règle
// donne 94 % d'accord entre codes GeoNames voisins — elle est donc assez fine pour discriminer sans être tatillonne.
const longueurPrefixe = ref => Math.min(3, Math.max(2, Math.round(chiffres(ref).length / 2)));
const VOISIN_MAX_KM = 30;
function majoritaire(formes){
  const c = new Map();
  formes.forEach(f => c.set(f, (c.get(f) || 0) + 1));
  return [...c].sort((a, b) => b[1] - a[1]);
}

const parPays = new Map();
if(!fs.existsSync(CACHE)){ console.error('aucune moisson : lancer d\'abord scripts/fetch-osm-postcodes.js'); process.exit(1); }
for(const l of fs.readFileSync(CACHE, 'utf8').split('\n')){
  if(!l) continue;
  let e; try { e = JSON.parse(l); } catch(x){ continue; }
  if(!parPays.has(e.cc)) parPays.set(e.cc, []);
  parPays.get(e.cc).push(e);
}

let gardes = 0, refuses = 0;
const motifs = {};
for(const [cc, liste] of [...parPays].sort()){
  const avecCode = liste.filter(e => e.cp);
  if(!avecCode.length){
    console.log(cc + ' : ' + liste.length + ' lieux interrogés, AUCUN code rendu par la carte');
    continue;
  }
  // Référence de forme : les codes déjà publiés du pays, sinon la moisson elle-même.
  const publies = codesPublies(cc);
  const refFormes = majoritaire((publies.length >= 20 ? publies : avecCode.map(e => e.cp)).map(forme));
  const total = refFormes.reduce((s, x) => s + x[1], 0);
  const admises = new Set(refFormes.filter(x => x[1] / total >= 0.05).map(x => x[0]));
  const source = publies.length >= 20 ? publies.length + ' codes déjà publiés' : 'la moisson elle-même';

  const voisins = voisinage(cc);
  const nPref = voisins.length ? longueurPrefixe(voisins[0].cp) : 2;
  const retenus = [], rejets = [];
  for(const e of avecCode){
    if(cpContredit(cc, e.nom, e.lat, e.lon)){ rejets.push([e, 'code VIDÉ volontairement (CP_CONTREDIT), démenti par la carte']); continue; }
    if(!admises.has(forme(e.cp))){ rejets.push([e, 'forme « ' + forme(e.cp) +' » inconnue du pays']); continue; }
    if(e.km != null && e.km > DISTANCE_MAX_KM){ rejets.push([e, 'objet trouvé à ' + e.km + ' km']); continue; }
    let best = null, bestKm = VOISIN_MAX_KM;
    for(const v of voisins){
      if(Math.abs(v.lat - e.lat) > 0.4 || Math.abs(v.lon - e.lon) > 0.6) continue;
      const d = km(e.lat, e.lon, v.lat, v.lon);
      if(d < bestKm){ bestKm = d; best = v; }
    }
    if(!best){ rejets.push([e, 'aucun code publié à moins de ' + VOISIN_MAX_KM + ' km pour le corroborer']); continue; }
    if(chiffres(e.cp).slice(0, nPref) !== chiffres(best.cp).slice(0, nPref)){
      rejets.push([e, 'démenti par son voisin à ' + bestKm.toFixed(1) + ' km, « ' + best.cp + ' »']);
      continue;
    }
    e.voisin = best.cp; e.voisinKm = +bestKm.toFixed(1);
    retenus.push(e);
  }
  retenus.sort((a, b) => b.pop - a.pop);
  gardes += retenus.length; refuses += rejets.length;
  rejets.forEach(([, m]) => { const k = m.replace(/«[^»]*»/, '«…»').replace(/à [\d.]+ km/, 'à plus de 2 km'); motifs[k] = (motifs[k] || 0) + 1; });
  console.log(cc + ' : ' + liste.length + ' interrogés, ' + avecCode.length + ' avec code, ' + retenus.length
    + ' retenus, ' + rejets.length + ' écartés   [forme(s) admise(s) : ' + [...admises].join(', ') + ', d\'après ' + source + ']');
  rejets.slice(0, 3).forEach(([e, m]) => console.log('      écarté  ' + e.nom + ' « ' + e.cp + ' » — ' + m));
  if(ECRIRE && retenus.length){
    const lignes = retenus.map(e => [e.lat.toFixed(4), e.lon.toFixed(4), e.cp, e.nom, e.km == null ? '' : e.km, e.le, e.voisin + '@' + e.voisinKm + 'km'].join('\t'));
    fs.writeFileSync(path.join(DOSSIER, cc + '.txt'),
      '# Codes postaux tirés d\'OpenStreetMap via Nominatim (ODbL), pour des lieux qu\'aucun point du fichier postal\n'
      + '# GeoNames n\'approche à moins de 15 km. Produit par scripts/fetch-osm-postcodes.js puis apply-osm-postcodes.js.\n'
      + '# lat\tlon\tcode\tnom\tdistance_km\tdate\n' + lignes.join('\n') + '\n');
  }
}
console.log('\nTOTAL : ' + gardes + ' code(s) retenu(s), ' + refuses + ' écarté(s)');
Object.keys(motifs).sort((a, b) => motifs[b] - motifs[a]).forEach(m => console.log('   ' + motifs[m] + ' × ' + m));
if(!ECRIRE) console.log('(--ecrire pour produire scripts/postal-osm/XX.txt)');
