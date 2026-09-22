// Script ponctuel pour la Géorgie UNIQUEMENT (pas un remplacement de build-country-communes.js,
// toujours utilisé pour tous les autres pays) : GeoNames n'a AUCUN fichier de codes postaux pour ce
// pays (téléchargement export/zip/GE.zip -> 404, vérifié — même cas que la Bosnie/le Monténégro/le
// Kosovo/la Grèce). Contrairement à ces quatre-là, aucune source tierce déjà géolocalisée
// (grpostcodes) ni aucun annuaire simple par ville n'existe : reconstruit à la place depuis
// yell.ge (annuaire géorgien), qui publie un vrai annuaire officieux par municipalité —
// https://www.yell.ge/info/post_indexs.php?id_city=N liste, pour chacune des 64 municipalités du
// pays (voir dump/ge_municipality_names.txt, extrait de la page d'index), une ligne par localité
// avec son code postal à 4 chiffres (parse-ge-postal.js -> ge-postal-raw.json). PAS une source
// officielle (contrairement à Wikipedia) ni un jeu de données géolocalisé comme pour la Grèce :
// annuaire commercial de dernier recours, documenté comme tel (voir README, "Pays couverts").
//
// Particularité par rapport à Bosnie/Monténégro (rapprochement par nom, mais en écriture latine des
// deux côtés) : yell.ge liste les noms en écriture GÉORGIENNE (მხედრული) alors que GeoNames stocke
// le nom canonique de chaque lieu en translittération latine (ex. "Bat'umi") — le rapprochement par
// nom se fait donc via le nom géorgien ALTERNATIF de chaque lieu GeoNames (colonne "alternatenames"
// du dump principal, complétée par le fichier alternateNames dédié qui est nettement plus complet :
// 4926 lieux avec un nom géorgien identifié contre 4143 avec le seul dump principal). Le tag de
// langue "ka" du fichier alternateNames contient par endroits des translittérations LATINES
// mal étiquetées (Zugdidi, Zestaponi... étiquetés "ka" mais en alphabet latin) — filtré en ne
// retenant que les entrées contenant réellement des caractères géorgiens (plage Unicode Ⴀ-ჿ).
//
// Conséquence attendue et acceptée de ce rapprochement par nom géorgien : l'Abkhazie et l'Ossétie
// du Sud (territoires séparatistes non contrôlés par le gouvernement géorgien, où la Poste
// géorgienne — donc yell.ge — n'opère pas) n'ont AUCUN code postal dans la source et sont de ce
// fait automatiquement exclues (aucune correspondance de nom, comme n'importe quel lieu sans code
// postal dans le pipeline standard) — cohérent avec le fait qu'aucun itinéraire routier réel n'est
// possible vers ces régions depuis la Géorgie contrôlée par son gouvernement de toute façon.
//
// Cas spécial Tbilissi : seule ville dont la page yell.ge détaille des RUES individuelles (~1500
// lignes, 15 codes distincts 01xx) plutôt qu'une liste de localités de la municipalité — parse-ge-
// postal.js l'exclut explicitement de ge-postal-raw.json. Un unique code réel est utilisé à la
// place : "0100", code postal documenté de l'adresse officielle du siège de la Poste géorgienne
// (Station Square 2, 0100 Tbilisi — Wikipédia, article "Georgian Post") ; ce n'est pas un code de
// distribution de rue à proprement parler mais un code de zone centrale réel et vérifiable, seul
// choix raisonnable puisque Tbilissi est une unique entrée GeoNames (aucune subdivision par
// district) et que les codes de rues eux-mêmes (0102 à 0190) ne se rattachent à aucune coordonnée
// précise réutilisable ici.
const fs = require('fs');
const path = require('path');
// Corrections communes à tous les générateurs de lieux (audit n° 11) : noms nettoyés, lieux écartés, quasi-doublons —
// voir scripts/communes-corrections.js.
const { excludePlace, preparePlaceName, dropNearDuplicates } = require('./communes-corrections.js');

const KEEP_FEATURE_CODES = new Set(['PPL','PPLA','PPLA2','PPLA3','PPLA4','PPLA5','PPLC','PPLF','PPLG','PPLL','PPLS']);
const GEORGIAN_SCRIPT_RE = /[Ⴀ-ჿ]/;

function norm(s){ return s.trim().toLowerCase().replace(/[\s-]+/g, ''); }

function haversineKm(a, b){
  const R = 6371, dLat = (b.lat-a.lat)*Math.PI/180, dLon = (b.lon-a.lon)*Math.PI/180;
  const x = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}

// --- 1. Nom géorgien par geonameid, depuis le fichier alternateNames dédié (le plus complet). ---
const altLines = fs.readFileSync(path.join(__dirname, 'altnames', 'GE.txt'), 'utf8').split('\n').filter(Boolean);
const kaCandidatesByGid = new Map();
for(const line of altLines){
  const c = line.split('\t');
  if(c[2] !== 'ka') continue;
  const name = c[3], isPreferred = c[4] === '1';
  if(!GEORGIAN_SCRIPT_RE.test(name)) continue; // écarte les translittérations latines mal étiquetées "ka"
  if(!kaCandidatesByGid.has(c[1])) kaCandidatesByGid.set(c[1], []);
  kaCandidatesByGid.get(c[1]).push({ name, isPreferred });
}
const kaByGid = new Map();
for(const [gid, arr] of kaCandidatesByGid){
  const pref = arr.find(x => x.isPreferred);
  kaByGid.set(gid, (pref || arr[0]).name);
}

// --- 2. Neuf écarts confirmés entre le nom géorgien effectivement utilisé par yell.ge (nom de la
// municipalité elle-même, ou de la localité réellement recherchée) et celui que porte l'entrée
// GeoNames correspondante (soit absent du fichier alternateNames, soit trompeur) — chacun vérifié
// individuellement en comparant population/coordonnées à l'entrée voisine correctement étiquetée :
// * Samtredia (ville, 20 633 hab., admin1 Imereti) : le fichier alternateNames n'a de nom géorgien
//   que sur l'entrée voisine "Samtredia Municipality" (division administrative, pas une localité),
//   pas sur la ville elle-même (geonameid 612126) — nom géorgien connu par ailleurs (dump principal
//   d'une entrée tierce "Etserdzveli-Samtredia").
// * Baghdati (ville, 4 564 hab., Imereti, chef-lieu de la municipalité du même nom) : son entrée
//   GeoNames (615607) n'a AUCUN nom géorgien listé (seulement des variantes latines) ; une entrée
//   distincte "Baghdadi" (615610, à ne pas confondre) porte le nom géorgien ბაღდადი — orthographe
//   différente de ბაღდათი (yell.ge, terminaison -თი et non -დი), PAS le même mot : à ne pas utiliser
//   ici. Nom géorgien correct confirmé par le nom même de la municipalité (ge_municipality_names.txt,
//   id 11 "ბაღდათი", cohérent avec la romanisation ISO 9984 standard Baghdat'i/Baghdati).
// * Akhalkalaki (ville, 7 437 hab., Samtskhe-Djavakheti, chef-lieu de municipalité) : aucun nom
//   géorgien dans le fichier alternateNames pour cette entrée précise (614083) — confirmé par le nom
//   de la municipalité (id 7, "ახალქალაქი").
// * Kareli (ville, 6 746 hab., Chida Kartli, chef-lieu de municipalité) : même cas, seule l'entrée
//   voisine "Kareli Municipality" (division administrative) a un nom géorgien listé — confirmé par
//   le nom de la municipalité (id 60, "ქარელი").
// * Kharagauli (ville, chef-lieu de municipalité, Imereti) : son entrée GeoNames (7667751) n'a
//   AUCUN nom alternatif du tout (colonne dédiée vide, absente aussi du fichier alternateNames) —
//   confirmé par le nom de la municipalité (id 81, "ხარაგაული").
// * Tetritsqaro (ville, 5 041 hab., Kvemo Kartli, chef-lieu de municipalité) : nom géorgien présent
//   mais avec une espace ("თეთრი წყარო") que yell.ge n'utilise pas ("თეთრიწყარო") — déjà neutralisé
//   par norm() qui retire tirets/espaces des deux côtés, aucun override nécessaire au final, gardé
//   en commentaire pour mémoire (a bien été vérifié à la main avant de conclure que c'était un faux
//   négatif de la première passe).
const GEORGIAN_NAME_OVERRIDES = {
  'Samtredia': 'სამტრედია',
  'Baghdati': 'ბაღდათი',
  'Akhalkalaki': 'ახალქალაქი',
  'Kareli': 'ქარელი',
  'Kharagauli': 'ხარაგაული'
};

// --- 3. Lieux GeoNames (classe P, codes "lieu habité nommé"). ---
const dumpLines = fs.readFileSync(path.join(__dirname, 'dump', 'GE.txt'), 'utf8').split('\n').filter(Boolean);
const places = [];
for(const line of dumpLines){
  const c = line.split('\t');
  if(c[6] !== 'P' || !KEEP_FEATURE_CODES.has(c[7])) continue;
  const geonameid = c[0], name = preparePlaceName('GE', c[0], c[1]);
  if(excludePlace('GE', geonameid, name, parseFloat(c[4]), parseFloat(c[5]))) continue;
  let ka = GEORGIAN_NAME_OVERRIDES[name] || kaByGid.get(geonameid);
  if(!ka){
    const embedded = (c[3] || '').split(',').find(n => GEORGIAN_SCRIPT_RE.test(n));
    if(embedded) ka = embedded;
  }
  places.push({
    geonameid, name, ka,
    lat: parseFloat(c[4]), lon: parseFloat(c[5]),
    pop: parseInt(c[14], 10) || 0
  });
}

// --- 4. Table nom géorgien normalisé -> codes postaux, depuis yell.ge (Tbilissi exclue, voir
// parse-ge-postal.js, traitée à part au point 5). ---
const rawEntries = JSON.parse(fs.readFileSync(path.join(__dirname, 'ge-postal-raw.json'), 'utf8'));
const cpByName = new Map();
for(const e of rawEntries){
  const key = norm(e.name);
  if(!cpByName.has(key)) cpByName.set(key, new Set());
  cpByName.get(key).add(e.cp);
}

// --- 5. Regroupement des lieux GeoNames par nom géorgien normalisé (plusieurs lieux distincts
// peuvent partager le même nom, comme pour tout autre pays de ce pipeline). ---
// NOM GÉORGIEN PLUS EXIGÉ (22/09/2026, demande de l'utilisateur : « on doit pouvoir les rechercher quand même si on
// les connaît »). Le rapprochement avec l'annuaire postal se fait par le nom en écriture géorgienne — un lieu qui
// n'en a pas ne peut donc pas recevoir de code. Mais il existe : il est publié, sans code, comme partout ailleurs
// depuis le 21/09/2026. Les lieux SANS nom géorgien sont regroupés sous une clé qui ne correspondra à aucun code.
const placesByKaKey = new Map();
let sansNomGeorgien = 0;
for(const p of places){
  const key = p.ka ? norm(p.ka) : ' sans-nom-georgien|' + p.geonameid;
  if(!p.ka) sansNomGeorgien++;
  if(!placesByKaKey.has(key)) placesByKaKey.set(key, []);
  placesByKaKey.get(key).push(p);
}

let matched = 0;
const ambiguousNames = [];
const lines = [];
// geonameid -> nom canonique final, UNIQUEMENT pour les communes ayant survécu au rapprochement —
// repris par build-ge-aliases.js, même principe que canonicalByGeonameId dans build-aliases.js/
// build-me-aliases.js.
const canonicalByGeonameId = {};
// CODE POSTAL FACULTATIF (21/09/2026, demande de l'utilisateur) : un lieu n'est plus écarté faute de code. Tous les
// lieux du dump sont publiés ; le code va à celui que le rapprochement par nom géorgien désigne, les autres sortent
// avec un code vide. Le rapprochement lui-même est inchangé.
placesByKaKey.forEach((candidates, key) => {
  const cps = cpByName.get(key);
  let chosen = candidates[0];
  if(cps && cps.size && candidates.length > 1){
    const byPop = candidates.slice().sort((a, b) => b.pop - a.pop);
    const dominant = byPop[0].pop > 0 && (byPop.length === 1 || byPop[1].pop === 0 || byPop[0].pop >= byPop[1].pop * 10);
    if(dominant){
      chosen = byPop[0];
    } else {
      const allClose = candidates.every(c => haversineKm(candidates[0], c) <= 15);
      if(!allClose){ ambiguousNames.push(key + ' (' + candidates.length + ' lieux distincts)'); chosen = null; }
      else chosen = byPop[0];
    }
  }
  if(cps && cps.size && chosen) matched++;
  candidates.forEach(p => {
    const àLui = (cps && cps.size && chosen === p) ? Array.from(cps).join(',') : '';
    lines.push(`${p.pop};${p.lon.toFixed(4)},${p.lat.toFixed(4)};${àLui};;${p.name}`);
    canonicalByGeonameId[p.geonameid] = p.name;
  });
});

// --- 6. Tbilissi, cas spécial (voir commentaire d'en-tête) : un seul code, 0100. ---
const tbilisi = places.find(p => p.name === 'Tbilisi');
if(!tbilisi) throw new Error('Entrée GeoNames "Tbilisi" introuvable — vérifier le dump.');
// Depuis que tous les lieux sont publiés (21/09/2026), Tbilissi sort DÉJÀ de la boucle ci-dessus, sans code : la
// ligne spéciale ferait doublon et le dédoublonnage pouvait garder celle qui n'a pas de code. On remplace donc la
// ligne existante au lieu d'en ajouter une seconde.
const ligneTbilisi = `${tbilisi.pop};${tbilisi.lon.toFixed(4)},${tbilisi.lat.toFixed(4)};0100;;${tbilisi.name}`;
const iTbilisi = lines.findIndex(l => l.endsWith(';' + tbilisi.name) && l.indexOf(`${tbilisi.lon.toFixed(4)},${tbilisi.lat.toFixed(4)}`) >= 0);
if(iTbilisi >= 0) lines[iTbilisi] = ligneTbilisi; else lines.push(ligneTbilisi);
canonicalByGeonameId[tbilisi.geonameid] = tbilisi.name;
matched++;

const outPath = path.join(__dirname, '..', 'public', 'data', 'communes-ge.txt');
fs.writeFileSync(outPath, dropNearDuplicates(lines).join('\n') + '\n', 'utf8'); // quasi-doublons (voir communes-corrections.js)
fs.writeFileSync(path.join(__dirname, 'ge-canonical-by-geonameid.json'), JSON.stringify(canonicalByGeonameId), 'utf8');
console.log('GE :', places.length, 'lieux bruts (classe P) ->', placesByKaKey.size, 'groupes dont', sansNomGeorgien, 'lieux sans nom géorgien (publiés sans code) ->',
  lines.length, 'avec code postal (', matched, 'noms rapprochés, dont Tbilissi en cas spécial) ->', outPath);
console.log(ambiguousNames.length, 'noms ÉCARTÉS car ambigus :');
console.log(ambiguousNames.slice(0, 20).join('\n'));

// --- 7. Rapport des plus grosses localités SANS correspondance, pour repérage d'overrides manqués. ---
const matchedKeys = new Set();
placesByKaKey.forEach((_, key) => { if(cpByName.has(key)) matchedKeys.add(key); });
const unmatched = places
  .filter(p => p.name !== 'Tbilisi')
  .filter(p => !p.ka || !matchedKeys.has(norm(p.ka)))
  .sort((a, b) => b.pop - a.pop);
console.log('\nTop 40 lieux sans correspondance (par population) :');
console.log(unmatched.slice(0, 40).map(p => `${p.name} (pop ${p.pop}, ka=${p.ka || '?'})`).join('\n'));
