// Script ponctuel pour la Bosnie-Herzégovine UNIQUEMENT (pas un remplacement de
// build-country-communes.js, toujours utilisé pour tous les autres pays) : GeoNames n'a AUCUN
// fichier de codes postaux pour ce pays (téléchargement export/zip/BA.zip -> 404, vérifié), un cas
// inédit parmi tous les pays déjà ajoutés. Choix explicite de l'utilisateur (voir commit) :
// reconstruire les codes postaux réels depuis la liste Wikipedia "Postal codes in Bosnia and
// Herzegovina" (sourcée BH Pošta/HP Mostar/Pošte Srpske, les trois opérateurs postaux du pays —
// voir parse-ba-wiki-postal.js pour l'extraction), rapprochée ici par NOM plutôt que par
// coordonnées (le pipeline habituel, nearest() dans build-country-communes.js, a besoin de
// coordonnées côté fichier de codes postaux, absentes ici puisque la source est Wikipedia et non
// un fichier GeoNames structuré).
const fs = require('fs');
const path = require('path');
// Corrections communes à tous les générateurs de lieux (audit n° 11) : noms nettoyés, lieux écartés, quasi-doublons —
// voir scripts/communes-corrections.js.
const { excludePlace, preparePlaceName, dropNearDuplicates } = require('./communes-corrections.js');

const KEEP_FEATURE_CODES = new Set(['PPL','PPLA','PPLA2','PPLA3','PPLA4','PPLA5','PPLC','PPLF','PPLG','PPLL','PPLS']);

// Même correction que pour la Croatie (voir build-country-communes.js) : le Ð latin (Eth, U+00D0)
// confondu avec le VRAI Đ (D barré, U+0110) dans le dump GeoNames — remplacement global, sans
// risque pour les autres pays.
function cleanName(raw){ return raw.replace(/Ð/g, 'Đ'); }
// Normalisation pour le rapprochement par nom : casse + espaces uniquement, les diacritiques sont
// conservés (Wikipedia et GeoNames utilisent tous deux l'orthographe bosnienne/croate/serbe standard
// en alphabet latin, un rapprochement exact sur ces caractères est donc fiable et plus sûr qu'un
// dépouillement des diacritiques qui risquerait de fusionner deux lieux réellement distincts).
function norm(s){ return s.trim().toLowerCase().replace(/\s+/g, ' '); }

const dumpRaw = fs.readFileSync(path.join(__dirname, 'dump', 'BA_dump.txt'), 'utf8');
const rows = dumpRaw.split('\n').filter(Boolean).map(line => line.split('\t'));
const places = rows
  .filter(c => c[6] === 'P' && KEEP_FEATURE_CODES.has(c[7]) && !excludePlace('BA', c[0], preparePlaceName('BA', c[0], cleanName(c[1])), parseFloat(c[4]), parseFloat(c[5]))) // 13e audit du 19/09/2026 : filtre sur le nom publié (renommages compris), voir communes-corrections.js
  .map(c => ({
    geonameid: c[0],
    name: preparePlaceName('BA', c[0], cleanName(c[1])),
    lat: parseFloat(c[4]),
    lon: parseFloat(c[5]),
    admin1: c[10] || '',
    pop: parseInt(c[14], 10) || 0
  }))
  .filter(p => !isNaN(p.lat) && !isNaN(p.lon) && p.name);

// Dédoublonnage : même nom normalisé + coordonnées quasi identiques -> un seul gardé (le plus
// peuplé) — identique à build-country-communes.js.
const seen = new Map();
for(const p of places){
  const key = norm(p.name) + '|' + p.lat.toFixed(2) + '|' + p.lon.toFixed(2);
  const existing = seen.get(key);
  if(!existing || p.pop > existing.pop) seen.set(key, p);
}
const deduped = Array.from(seen.values());

// Table nom normalisé -> codes postaux (une commune peut avoir plusieurs codes, ex. Banja Luka
// 78000/78103/78108/78114 — même format `cp1,cp2,...` que communes.txt/parseCommunesFile).
// SOURCE WIKIPEDIA ABSENTE DU DÉPÔT (21/09/2026) : scripts/ba-postal-wiki.json n'est pas commité, ce qui rendait ce
// générateur inexécutable depuis l'audit n° 11 — et la correction du jour lui serait restée inaccessible. Repli :
// les codes DÉJÀ PUBLIÉS dans public/data/communes-ba.txt sont relus et réindexés par nom, ce qui reconstitue
// exactement la table que la source produisait pour les lieux qu'elle couvrait. Les autres lieux, eux, n'ont
// jamais eu de code : ils sortent avec un code vide, ce qui est justement l'objet de la correction.
const sourcePath = path.join(__dirname, 'ba-postal-wiki.json');
const publiéPath = path.join(__dirname, '..', 'public', 'data', 'communes-ba.txt');
const wikiEntries = fs.existsSync(sourcePath)
  ? JSON.parse(fs.readFileSync(sourcePath, 'utf8'))
  : fs.readFileSync(publiéPath, 'utf8').split('\n').filter(Boolean).flatMap(l => {
      const ch = l.split(';');
      return ch[2] ? ch[2].split(',').map(cp => ({ nameBare: ch[4], cp: cp })) : [];
    });
if(!fs.existsSync(sourcePath)) console.log('BA : ba-postal-wiki.json absent — ' + wikiEntries.length + ' codes repris du fichier déjà publié');
const cpByName = new Map();
for(const e of wikiEntries){
  const key = norm(cleanName(e.nameBare));
  if(!cpByName.has(key)) cpByName.set(key, []);
  const arr = cpByName.get(key);
  if(!arr.includes(e.cp)) arr.push(e.cp);
}

function haversineKm(a, b){
  const R = 6371, dLat = (b.lat-a.lat)*Math.PI/180, dLon = (b.lon-a.lon)*Math.PI/180;
  const x = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}
// Regroupe les communes du dump par nom normalisé : contrairement au rapprochement par COORDONNÉES
// du pipeline habituel (une seule commune peut jamais être la plus proche par erreur d'un point trop
// lointain), un rapprochement par NOM SEUL est dangereux dès qu'un même nom de village existe à
// plusieurs endroits du pays (très fréquent en Bosnie-Herzégovine — vérifié : "Zabrđe" désigne 8
// lieux distincts, jusqu'à 157 km d'écart). Assigner aveuglément l'unique code postal Wikipedia
// trouvé pour ce nom à chacun aurait fabriqué des codes postaux FAUX pour la plupart d'entre eux —
// contraire au principe du projet (seulement de vraies données).
const dumpByName = new Map();
for(const p of deduped){
  const key = norm(p.name);
  if(!dumpByName.has(key)) dumpByName.set(key, []);
  dumpByName.get(key).push(p);
}

// Noms des divisions administratives GeoNames (entité / district de Brčko), pour la colonne « région » : elle était
// laissée vide faute de source Wikipedia exploitable, alors que le dump la porte (21/09/2026).
const admin1Names = new Map();
fs.readFileSync(path.join(__dirname, 'admin1CodesASCII.txt'), 'utf8').split('\n').forEach(l => {
  const f = l.split('\t');
  if(f[0] && f[1]) admin1Names.set(f[0], f[1]);
});

let matched = 0, unmatchedNames = [], ambiguousNames = [];
const lines = [];
// geonameid -> nom canonique, UNIQUEMENT pour les communes ayant survécu au rapprochement (donc
// réellement présentes dans communes-ba.txt) — repris par build-ba-aliases.js pour l'extraction
// des alias multilingues, sur le même principe que canonicalByGeonameId dans build-aliases.js.
const canonicalByGeonameId = {};
// CODE POSTAL FACULTATIF (21/09/2026, demande de l'utilisateur). Jusqu'ici, SEULS les lieux dont le nom figurait
// dans la liste de codes postaux étaient publiés, et un seul par groupe d'homonymes : la Bosnie ne comptait que
// 374 communes sur les 21 389 du dump. Le code postal aide à retrouver sa ville, il ne décide pas si elle existe.
// Tous les lieux du dump sont donc publiés ; le code va à celui que le rapprochement désigne, les autres sortent
// avec un code vide. Le rapprochement lui-même (règles 1 et 2 ci-dessous) est inchangé.
dumpByName.forEach((candidates, key) => {
  const cps = cpByName.get(key);
  let chosen = candidates[0];
  if(cps && cps.length && candidates.length > 1){
    // Règle 1, la plus sûre : une seule commune homonyme a une population réelle connue, largement
    // dominante sur les autres (0, ou au moins 10x moins peuplées) — GeoNames n'a souvent qu'un
    // chiffre de population fiable que pour le "vrai" lieu, les homonymes étant de tout petits
    // hameaux à population nulle dans ses données. Vérifié sur les grandes villes concernées (Zenica
    // 164 423 hab. contre 0 pour ses deux homonymes, Travnik 31 127 contre 0, Višegrad 6 087 contre
    // 0, Vitez 8 140 contre 0) : cette règle les récupère sans risque plutôt que de les perdre.
    const byPop = candidates.slice().sort((a, b) => b.pop - a.pop);
    const dominant = byPop[0].pop > 0 && (byPop.length === 1 || byPop[1].pop === 0 || byPop[0].pop >= byPop[1].pop * 10);
    if(dominant){
      chosen = byPop[0];
    } else {
      // Règle 2, repli : si tous les homonymes sont à moins de 15 km les uns des autres (probablement
      // la même localité, plusieurs points GeoNames légèrement décalés plutôt que des lieux
      // réellement distincts), le code est assigné au plus peuplé d'entre eux.
      const allClose = candidates.every(c => haversineKm(candidates[0], c) <= 15);
      if(!allClose){ ambiguousNames.push(key + ' (' + candidates.length + ' lieux distincts)'); chosen = null; }
      else chosen = byPop[0];
    }
  }
  if(cps && cps.length && chosen) matched++;
  // region (4e colonne) laissée vide, comme Saint-Marin/la Slovénie avant : Wikipedia ne fournit
  // pas de nom de région/canton exploitable ici, une limite cosmétique déjà acceptée pour d'autres
  // pays, sans effet sur la recherche ou l'affichage (voir formatCpBadge, qui n'affiche jamais ce
  // champ directement).
  candidates.forEach(p => {
    const àLui = (cps && cps.length && chosen === p) ? cps.join(',') : '';
    lines.push(`${p.pop};${p.lon.toFixed(4)},${p.lat.toFixed(4)};${àLui};${admin1Names.get('BA.' + (p.admin1 || '')) || ''};${p.name}`);
    canonicalByGeonameId[p.geonameid] = p.name;
  });
});

// Diagnostic : entrées Wikipedia n'ayant trouvé AUCUNE commune GeoNames correspondante (utile pour
// vérifier qu'il ne s'agit pas d'un problème de normalisation plutôt que d'un lieu réellement absent
// du dump GeoNames).
const dumpNames = new Set(deduped.map(p => norm(p.name)));
for(const e of wikiEntries){
  const key = norm(cleanName(e.nameBare));
  if(!dumpNames.has(key)) unmatchedNames.push(e.nameWithDisambig + ' (' + e.cp + ')');
}

const outPath = path.join(__dirname, '..', 'public', 'data', 'communes-ba.txt');
fs.writeFileSync(outPath, dropNearDuplicates(lines).join('\n') + '\n', 'utf8'); // quasi-doublons (voir communes-corrections.js)
fs.writeFileSync(path.join(__dirname, 'ba-canonical-by-geonameid.json'), JSON.stringify(canonicalByGeonameId), 'utf8');
console.log('BA : ', places.length, 'lieux bruts ->', deduped.length, 'dédoublonnés ->', lines.length,
  'avec code postal (', matched, 'noms rapprochés d\'un code Wikipedia ) ->', outPath);
console.log(ambiguousNames.length, 'noms ÉCARTÉS car ambigus (plusieurs lieux distincts >15km sous le même nom) :');
console.log(ambiguousNames.slice(0, 20).join('\n'));
if(ambiguousNames.length > 20) console.log('... (' + (ambiguousNames.length - 20) + ' de plus)');
console.log(unmatchedNames.length, 'entrées Wikipedia SANS commune GeoNames correspondante (nom introuvable dans le dump) :');
console.log(unmatchedNames.slice(0, 40).join('\n'));
if(unmatchedNames.length > 40) console.log('... (' + (unmatchedNames.length - 40) + ' de plus)');
