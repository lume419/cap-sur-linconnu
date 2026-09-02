// Script ponctuel pour le Kosovo UNIQUEMENT (pas un remplacement de build-country-communes.js) :
// GeoNames n'a AUCUN fichier de codes postaux pour ce pays (export/zip/XK.zip -> 404, vérifié) —
// même cas que la Bosnie-Herzégovine et le Monténégro. Contrairement aux deux, l'article Wikipedia
// "Postal codes in Kosovo" existe mais ne liste QUE des plages par district (ex. "100xx" pour
// Prishtinë), pas un vrai détail par lieu. Source utilisée à la place : postakosoves.com, le site
// officiel de la poste kosovare (Posta e Kosovës) — sa page de recherche de codes postaux embarque
// directement un tableau JS complet {region, subregion, code} (133 entrées) dans le HTML de la page,
// extrait via l'API REST WordPress du site (wp-json/wp/v2/pages/962) plutôt que scrapé au navigateur.
// Meilleure source que celle utilisée pour le Monténégro (postanskibroj.cu.rs, un annuaire tiers) :
// ici directement la poste nationale elle-même. "subregion" correspond au nom de lieu à rapprocher
// (certaines entrées comme "Prishtina 3/4/5..." ou "Qendra tranzite postare" sont des zones/centres
// postaux internes sans lieu GeoNames correspondant — laissées de côté sans erreur, diagnostic en fin
// de script). Rapproché par NOM comme pour la Bosnie/le Monténégro.
const fs = require('fs');
const path = require('path');

const KEEP_FEATURE_CODES = new Set(['PPL','PPLA','PPLA2','PPLA3','PPLA4','PPLA5','PPLC','PPLF','PPLG','PPLL','PPLS']);

// La capitale est stockée dans le dump GeoNames sous "Pristina" — pas un exonyme étranger comme pour
// le Danemark/l'Albanie, mais une orthographe SERBE/yougoslave (sans le "h" albanais) inconsistante
// avec le reste du dump kosovar, qui utilise systématiquement des formes albanaises INDÉFINIES pour
// ses autres grandes villes (Pejë, Mitrovicë, Gjakovë, Gjilan, Ferizaj, Prizren — vérifié). Corrigée
// ici en "Prishtinë" (forme indéfinie albanaise), cohérente avec cette convention déjà en place.
// Au-delà de la capitale, plusieurs villes MOYENNES du Kosovo sont elles aussi stockées dans le dump
// GeoNames sous leur nom SERBE plutôt qu'albanais — contrairement aux 7 plus grandes villes du pays
// (Prishtinë, Pejë, Mitrovicë, Gjakovë, Gjilan, Ferizaj, Prizren), déjà correctement en albanais.
// Corrigées ici vers la forme albanaise utilisée par la Poste du Kosovo elle-même (xk-postal-raw.json)
// — cohérent avec le fait que l'albanais est la langue très largement majoritaire du pays (~92%),
// même logique que "Pristina" ci-dessus. Trouvées en cherchant systématiquement l'équivalent serbe de
// chaque entrée postale albanaise restée sans correspondance GeoNames après un premier passage.
const NAME_OVERRIDES = {
  Pristina: 'Prishtinë',
  Glogovac: 'Drenas',
  'Suva Reka': 'Suharekë',
  Orahovac: 'Rahovec',
  Kamenica: 'Kamenicë',
  Vitina: 'Viti',
  Štrpce: 'Shtërpcë',
  Klina: 'Klinë',
  Mališevo: 'Malishevë',
  Srbica: 'Skenderaj',
  Zvečan: 'Zveçan',
  Klokot: 'Kllokot',
  Mamuša: 'Mamushë'
};
function cleanName(raw){ return NAME_OVERRIDES[raw] || raw; }

function norm(s){ return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' '); }
// La source postale (postakosoves.com) utilise systématiquement les formes albanaises DÉFINIES
// (Prishtina, Mitrovica, Peja, Gjakova — suffixe -a — et Prizreni, Gjilani, Ferizaji — suffixe -i),
// alors que GeoNames utilise les formes INDÉFINIES pour ces mêmes villes (Prishtinë, Mitrovicë, Pejë,
// Gjakovë, Prizren, Gjilan, Ferizaj) — un écart purement grammatical (défini/indéfini), pas une vraie
// divergence de nom. Plutôt que de deviner au cas par cas, on essaie AUSSI, pour chaque nom source non
// apparié tel quel, sa forme "dédéfinie" la plus probable (suffixe -a -> -ë, suffixe -i retiré) lors
// du rapprochement — heuristique simple, jamais appliquée au nom canonique affiché (toujours celui du
// dump GeoNames, jamais deviné).
function undefiniteForms(s){
  const out = [s];
  if(/a$/i.test(s)) out.push(s.slice(0, -1) + 'ë');
  if(/i$/i.test(s)) out.push(s.slice(0, -1));
  return out;
}

const dumpRaw = fs.readFileSync(path.join(__dirname, 'dump', 'XK_dump.txt'), 'utf8');
const rows = dumpRaw.split('\n').filter(Boolean).map(line => line.split('\t'));
const places = rows
  .filter(c => c[6] === 'P' && KEEP_FEATURE_CODES.has(c[7]))
  .map(c => ({
    geonameid: c[0],
    name: cleanName(c[1]),
    lat: parseFloat(c[4]),
    lon: parseFloat(c[5]),
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

const postalEntries = JSON.parse(fs.readFileSync(path.join(__dirname, 'xk-postal-raw.json'), 'utf8'));
const cpByName = new Map();
for(const e of postalEntries){
  // Enregistré sous la forme définie normalisée ET sa forme "dédéfinie" (voir undefiniteForms) : le
  // dump GeoNames utilise systématiquement la forme indéfinie pour les grandes villes, cette dernière
  // clé est donc celle qui matchera le plus souvent lors du rapprochement ci-dessous.
  for(const form of undefiniteForms(e.subregion)){
    const key = norm(form);
    if(!cpByName.has(key)) cpByName.set(key, []);
    const arr = cpByName.get(key);
    if(!arr.includes(e.code)) arr.push(e.code);
  }
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

let matched = 0, unmatchedNames = [], ambiguousNames = [];
const lines = [];
const canonicalByGeonameId = {};
dumpByName.forEach((candidates, key) => {
  const cps = cpByName.get(key);
  if(!cps || !cps.length) return;
  let chosen = candidates[0];
  if(candidates.length > 1){
    const byPop = candidates.slice().sort((a, b) => b.pop - a.pop);
    const dominant = byPop[0].pop > 0 && (byPop.length === 1 || byPop[1].pop === 0 || byPop[0].pop >= byPop[1].pop * 10);
    if(dominant){
      chosen = byPop[0];
    } else {
      const allClose = candidates.every(c => haversineKm(candidates[0], c) <= 15);
      if(!allClose){ ambiguousNames.push(key + ' (' + candidates.length + ' lieux distincts)'); return; }
      chosen = byPop[0];
    }
  }
  matched++;
  lines.push(`${chosen.pop};${chosen.lon.toFixed(4)},${chosen.lat.toFixed(4)};${cps.join(',')};;${chosen.name}`);
  canonicalByGeonameId[chosen.geonameid] = chosen.name;
});

const dumpNames = new Set(deduped.map(p => norm(p.name)));
for(const e of postalEntries){
  const anyFormMatches = undefiniteForms(e.subregion).some(f => dumpNames.has(norm(f)));
  if(!anyFormMatches) unmatchedNames.push(e.subregion + ' (' + e.code + ', ' + e.region + ')');
}

const outPath = path.join(__dirname, '..', 'public', 'data', 'communes-xk.txt');
fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
fs.writeFileSync(path.join(__dirname, 'xk-canonical-by-geonameid.json'), JSON.stringify(canonicalByGeonameId), 'utf8');
console.log('XK : ', places.length, 'lieux bruts ->', deduped.length, 'dédoublonnés ->', lines.length,
  'avec code postal (', matched, 'noms rapprochés) ->', outPath);
console.log(ambiguousNames.length, 'noms ÉCARTÉS car ambigus :');
console.log(ambiguousNames.slice(0, 20).join('\n'));
console.log(unmatchedNames.length, 'entrées source SANS commune GeoNames correspondante :');
console.log(unmatchedNames.join('\n'));
