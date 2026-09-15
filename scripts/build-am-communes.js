// Script ponctuel pour l'Arménie UNIQUEMENT (pas un remplacement de build-country-communes.js,
// toujours utilisé pour tous les autres pays) : GeoNames n'a AUCUN fichier de codes postaux pour ce
// pays (téléchargement export/zip/AM.zip -> 404, vérifié). Contrairement à la Bosnie/au Monténégro/
// au Kosovo, aucune liste Wikipédia détaillée ni annuaire tiers structuré n'a été trouvé — reconstruit
// à la place depuis la liste officielle des bureaux de poste d'Haypost (la poste nationale arménienne
// elle-même, pas un annuaire tiers — une source PLUS directe que yell.ge pour la Géorgie ou
// postanskibroj.cu.rs pour le Monténégro), page "Our network" (haypost.am/en/our-network) : 775
// bureaux, chacun avec son propre code postal à 4 chiffres et son adresse. Page rendue côté client
// (liste chargée en JS, pas un fichier téléchargeable en clair) — extraite via un navigateur, un
// bureau par ligne, puis collée telle quelle dans am-haypost-raw.txt (dump/), sans retouche.
// Rapproché par NOM comme pour la Bosnie/le Monténégro/le Kosovo (une commune peut avoir plusieurs
// bureaux/codes postaux, ex. Erevan a des dizaines d'entrées 00xx correspondant à des quartiers/rues
// de la capitale plutôt qu'à des communes distinctes — voir YEREVAN_CODE_RANGE plus bas).
const fs = require('fs');
const path = require('path');

const KEEP_FEATURE_CODES = new Set(['PPL','PPLA','PPLA2','PPLA3','PPLA4','PPLA5','PPLC','PPLF','PPLG','PPLL','PPLS']);

function norm(s){ return s.trim().toLowerCase().replace(/\s+/g, ' '); }

const dumpRaw = fs.readFileSync(path.join(__dirname, 'dump', 'AM_dump.txt'), 'utf8');
const rows = dumpRaw.split('\n').filter(Boolean).map(line => line.split('\t'));
const places = rows
  .filter(c => c[6] === 'P' && KEEP_FEATURE_CODES.has(c[7]))
  .map(c => ({
    geonameid: c[0],
    name: c[1],
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

// Les codes 0001-0108 sont tous des bureaux DE LA CAPITALE (adresses de rue erevanaises, sans nom de
// localité en préfixe — contrairement au reste du fichier où chaque entrée commence par "v. " ( village)
// ou "c. " (ville/chef-lieu)) : rattachés directement à "Yerevan" plutôt que laissés sans nom.
const YEREVAN_CODE_MAX = 199;

const rawLines = fs.readFileSync(path.join(__dirname, 'dump', 'am_haypost_branches.txt'), 'utf8')
  .split('\n').map(l => l.trimEnd()).filter(Boolean)
  // Unique typo source (virgule manquante entre le nom du village "Kosh" et le nom de rue "1st st.")
  // qui fait échouer le découpage habituel par virgule : corrigée à la main plutôt que par une
  // règle générale, seule occurrence du genre sur les 775 lignes.
  .map(l => l === '0215\tv. Kosh. 1st st., 14' ? '0215\tv. Kosh, 1st st., 14' : l);

// Écarts confirmés (vérifiés un par un contre le dump GeoNames) entre le nom utilisé par Haypost et
// le nom canonique GeoNames pour cette même localité — seulement deux cas, appliqués sur le nom
// SOURCE avant rapprochement (pas côté GeoNames, contrairement à NAME_OVERRIDES ailleurs dans ce
// projet : ici c'est le nom postal qui diverge, pas le dump géographique). "Etchmiadzin"/"Echmiadzin"
// (5 bureaux, 1101-1107) -> "Vagharshapat" : nom historique/religieux toujours utilisé par la poste
// (siège du catholicossat apostolique arménien) mais GeoNames stocke la commune sous son nom OFFICIEL
// actuel "Vagharshapat" (rebaptisée ainsi en 1995) — "Etchmiadzin"/"Echmiadzin" figurent bien dans sa
// liste de noms alternatifs GeoNames, confirmant qu'il s'agit du même lieu.
// "N. Bazmaberd"/"N. Sasnashen" (abréviation Haypost pour "Nerkin", *bas/inférieur*) -> noms complets
// confirmés dans le dump GeoNames ("Nerkin Bazmaberd" pop. 1537, "Nerkin Sasnashen" pop. 1114).
const SETTLEMENT_OVERRIDES = {
  'etchmiadzin': 'Vagharshapat', 'echmiadzin': 'Vagharshapat',
  'n. bazmaberd': 'Nerkin Bazmaberd', 'n. sasnashen': 'Nerkin Sasnashen'
};

const cpByName = new Map();
const unparsed = [];
for(const line of rawLines){
  const m = line.match(/^(\d{4})\t(.*)$/);
  if(!m) continue;
  const cp = m[1], rest = m[2].trim();
  let settlement, altSettlement = null;
  if(parseInt(cp, 10) <= YEREVAN_CODE_MAX){
    settlement = 'Yerevan';
  } else {
    // "v. Nom, ..." / "c. Nom, ..." (village/ville, espace parfois absent après le point, parfois
    // le point lui-même absent) ; sinon la ligne commence directement par le nom de la localité
    // (quelques dizaines d'entrées sans préfixe v./c., ex. "Gyumri, Tigran Mets Ave., 1/1") — dans
    // les deux cas, le nom est le texte avant la première virgule.
    const stripped = rest.replace(/^[vc]\.?\s*/i, '');
    const firstPart = stripped.split(',')[0].trim().replace(/\.$/, ''); // "Kosh." (typo source, virgule
    // manquante avant la rue) -> "Kosh"
    // "Derek (Charchakis)" -> nom principal "Derek", variante entre parenthèses "Charchakis" gardée
    // à part comme repli : pour CE cas précis, c'est en fait "Charchakis" le nom canonique GeoNames
    // ("Derek" n'apparaît que dans sa liste de noms alternatifs) — les deux formes sont essayées au
    // rapprochement plutôt que de deviner laquelle est la "principale" pour GeoNames.
    const parenMatch = firstPart.match(/\(([^)]*)\)\s*$/);
    if(parenMatch) altSettlement = parenMatch[1].trim();
    settlement = firstPart.replace(/\s*\([^)]*\)\s*$/, '').trim();
    settlement = SETTLEMENT_OVERRIDES[norm(settlement)] || settlement;
  }
  if(!settlement){ unparsed.push(line); continue; }
  const key = norm(settlement);
  if(!cpByName.has(key)) cpByName.set(key, { display: settlement, cps: [], altKey: altSettlement ? norm(altSettlement) : null, altDisplay: altSettlement });
  const entry = cpByName.get(key);
  if(!entry.cps.includes(cp)) entry.cps.push(cp);
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

let matched = 0, ambiguousNames = [];
const lines = [];
cpByName.forEach((entry, key) => {
  // Essaie d'abord le nom source tel quel, puis la variante entre parenthèses le cas échéant (voir
  // "Derek (Charchakis)" plus haut : GeoNames peut stocker le lieu sous l'une OU l'autre forme).
  const candidates = dumpByName.get(key) || (entry.altKey ? dumpByName.get(entry.altKey) : null);
  if(!candidates || !candidates.length) return;
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
  lines.push(`${chosen.pop};${chosen.lon.toFixed(4)},${chosen.lat.toFixed(4)};${entry.cps.join(',')};;${chosen.name}`);
});

const dumpNames = new Set(deduped.map(p => norm(p.name)));
const unmatchedNames = [];
cpByName.forEach((entry, key) => {
  if(!dumpNames.has(key) && !(entry.altKey && dumpNames.has(entry.altKey))){
    unmatchedNames.push(entry.display + ' (' + entry.cps.join(',') + ')');
  }
});

const outPath = path.join(__dirname, '..', 'public', 'data', 'communes-am.txt');
fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
console.log('AM : ', places.length, 'lieux bruts ->', deduped.length, 'dédoublonnés ->', lines.length,
  'avec code postal (', matched, 'noms rapprochés) ->', outPath);
console.log(unparsed.length, 'lignes source non parsées :');
console.log(unparsed.join('\n'));
console.log(ambiguousNames.length, 'noms ÉCARTÉS car ambigus :');
console.log(ambiguousNames.join('\n'));
console.log(unmatchedNames.length, 'entrées source SANS commune GeoNames correspondante (échantillon) :');
console.log(unmatchedNames.slice(0, 40).join('\n'));
