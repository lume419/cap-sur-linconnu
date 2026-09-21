// Script ponctuel pour le Monténégro UNIQUEMENT (pas un remplacement de build-country-communes.js,
// toujours utilisé pour tous les autres pays) : GeoNames n'a AUCUN fichier de codes postaux pour ce
// pays (téléchargement export/zip/ME.zip -> 404, vérifié) — même cas que la Bosnie-Herzégovine.
// Contrairement à la Bosnie, cependant, AUCUNE liste Wikipédia "Postal codes in Montenegro" n'existe
// (vérifié : lien rouge sur la page "List of postal codes", DBpedia n'a qu'une version archivée d'un
// article depuis supprimé) — reconstruit à la place depuis postanskibroj.cu.rs/crnagora/, un annuaire
// indépendant de codes postaux serbo-monténégrins (136 entrées, système hérité de la Yougoslavie,
// stable depuis 1971, cohérent avec les échantillons croisés sur postnestevilke.com et
// postanskibrojevi.com.hr) — PAS une source officielle ni sous licence ouverte claire comme
// Wikipédia, choix de dernier recours faute de mieux, à documenter comme tel (voir README, "Pays
// couverts"). Rapproché par NOM comme pour la Bosnie (parse-me-postal.js -> me-postal-raw.json déjà
// au bon format grâce à un simple filtrage regex, pas besoin d'un vrai parseur wikitext ici).
const fs = require('fs');
const path = require('path');
// Corrections communes à tous les générateurs de lieux (audit n° 11) : noms nettoyés, lieux écartés, quasi-doublons —
// voir scripts/communes-corrections.js.
const { excludePlace, preparePlaceName, dropNearDuplicates } = require('./communes-corrections.js');

const KEEP_FEATURE_CODES = new Set(['PPL','PPLA','PPLA2','PPLA3','PPLA4','PPLA5','PPLC','PPLF','PPLG','PPLL','PPLS']);

function norm(s){ return s.trim().toLowerCase().replace(/\s+/g, ' '); }

const dumpRaw = fs.readFileSync(path.join(__dirname, 'dump', 'ME_dump.txt'), 'utf8');
const rows = dumpRaw.split('\n').filter(Boolean).map(line => line.split('\t'));
const places = rows
  .filter(c => c[6] === 'P' && KEEP_FEATURE_CODES.has(c[7]) && !excludePlace('ME', c[0], preparePlaceName('ME', c[0], c[1]), parseFloat(c[4]), parseFloat(c[5])))
  .map(c => ({
    geonameid: c[0],
    name: preparePlaceName('ME', c[0], c[1]),
    lat: parseFloat(c[4]),
    lon: parseFloat(c[5]),
    admin1: c[10] || '',
    pop: parseInt(c[14], 10) || 0
  }))
  .filter(p => !isNaN(p.lat) && !isNaN(p.lon) && p.name);

const seen = new Map();
for(const p of places){
  const key = norm(p.name) + '|' + p.lat.toFixed(2) + '|' + p.lon.toFixed(2);
  const existing = seen.get(key);
  if(!existing || p.pop > existing.pop) seen.set(key, p);
}
const deduped = Array.from(seen.values());

// Table nom normalisé -> codes postaux (une commune peut avoir plusieurs codes, ex. Podgorica a 14
// entrées 811xx, Nikšić en a 3, Pljevlja/Ulcinj/Bijelo Polje/Budva en ont 2 chacune).
const wikiEntries = JSON.parse(fs.readFileSync(path.join(__dirname, 'me-postal-raw.json'), 'utf8'));
const cpByName = new Map();
for(const e of wikiEntries){
  // Même désambiguation que pour la Bosnie : "Nom (Texte)" -> nameBare "Nom".
  const nameBare = e.name.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const key = norm(nameBare);
  if(!cpByName.has(key)) cpByName.set(key, []);
  const arr = cpByName.get(key);
  if(!arr.includes(e.cp)) arr.push(e.cp);
}

function haversineKm(a, b){
  const R = 6371, dLat = (b.lat-a.lat)*Math.PI/180, dLon = (b.lon-a.lon)*Math.PI/180;
  const x = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}
const dumpByName = new Map();
for(const p of deduped){
  const key = norm(p.name);
  if(!dumpByName.has(key)) dumpByName.set(key, []);
  dumpByName.get(key).push(p);
}

// Noms des divisions administratives GeoNames, pour la colonne « région », laissée vide jusqu'ici (21/09/2026).
const admin1Names = new Map();
fs.readFileSync(path.join(__dirname, 'admin1CodesASCII.txt'), 'utf8').split('\n').forEach(l => {
  const f = l.split('\t');
  if(f[0] && f[1]) admin1Names.set(f[0], f[1]);
});

let matched = 0, unmatchedNames = [], ambiguousNames = [];
const lines = [];
const canonicalByGeonameId = {};
// CODE POSTAL FACULTATIF (21/09/2026, demande de l'utilisateur). Jusqu'ici, SEULS les lieux dont le nom figurait
// dans la source de codes postaux étaient publiés, et un seul par groupe d'homonymes. Le code postal aide à
// retrouver sa ville, il ne décide pas si elle existe : tous les lieux du dump sont publiés, le code va à celui
// que le rapprochement désigne, les autres sortent avec un code vide. Le rapprochement est inchangé.
dumpByName.forEach((candidates, key) => {
  const cps = cpByName.get(key);
  let chosen = candidates[0];
  if(cps && cps.length && candidates.length > 1){
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
  if(cps && cps.length && chosen) matched++;
  candidates.forEach(p => {
    const àLui = (cps && cps.length && chosen === p) ? cps.join(',') : '';
    lines.push(`${p.pop};${p.lon.toFixed(4)},${p.lat.toFixed(4)};${àLui};${admin1Names.get('ME.' + (p.admin1 || '')) || ''};${p.name}`);
    canonicalByGeonameId[p.geonameid] = p.name;
  });
});

const dumpNames = new Set(deduped.map(p => norm(p.name)));
for(const e of wikiEntries){
  const nameBare = e.name.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const key = norm(nameBare);
  if(!dumpNames.has(key)) unmatchedNames.push(e.name + ' (' + e.cp + ')');
}

const outPath = path.join(__dirname, '..', 'public', 'data', 'communes-me.txt');
fs.writeFileSync(outPath, dropNearDuplicates(lines).join('\n') + '\n', 'utf8'); // quasi-doublons (voir communes-corrections.js)
fs.writeFileSync(path.join(__dirname, 'me-canonical-by-geonameid.json'), JSON.stringify(canonicalByGeonameId), 'utf8');
console.log('ME : ', places.length, 'lieux bruts ->', deduped.length, 'dédoublonnés ->', lines.length,
  'avec code postal (', matched, 'noms rapprochés) ->', outPath);
console.log(ambiguousNames.length, 'noms ÉCARTÉS car ambigus :');
console.log(ambiguousNames.slice(0, 20).join('\n'));
console.log(unmatchedNames.length, 'entrées source SANS commune GeoNames correspondante :');
console.log(unmatchedNames.join('\n'));
