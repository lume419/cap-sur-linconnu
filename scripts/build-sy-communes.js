// Script ponctuel pour la Syrie UNIQUEMENT (pas un remplacement de build-country-communes.js,
// toujours utilisé pour tous les autres pays) : GeoNames n'a AUCUN fichier de codes postaux pour ce
// pays (téléchargement export/zip/SY.zip -> 404, vérifié). Mais, à la différence de la Géorgie/du
// Monténégro/du Kosovo/de l'Arménie plus haut, ce n'est pas un problème de SOURCE — la Syrie n'a tout
// simplement AUCUN système de codes postaux en usage réel : le courrier y est distribué par
// gouvernorat/district/sous-district/localité/boîte postale, sans code numérique standard (vérifié :
// aucun article Wikipedia "Postal codes in Syria", smarty.com/global-address-formatting/syria-
// address-format-examples confirme l'absence de code ; plusieurs agrégateurs commerciaux affichent
// bien des "codes postaux" syriens, mais sans source officielle citée ni garantie qu'il ne s'agit pas
// de chiffres inventés — écartés).
//
// PREMIER CAS DE CE GENRE POUR CE PROJET : plutôt que d'omettre le pays (aucun autre pays couvert
// jusqu'ici n'a un système de codes postaux réellement ABSENT — tous les précédents, Bosnie/
// Monténégro/Kosovo/Géorgie/Arménie, avaient un vrai système simplement non repris par GeoNames), le
// champ "cp" utilise ici le code de gouvernorat ISO 3166-2:SY (ex. "SY-DI" Damas, "SY-HL" Alep) —
// un identifiant réel, officiel et stable, mais nettement plus grossier qu'un vrai code postal (14
// gouvernorats pour tout le pays, donc plusieurs dizaines de communes possibles sous un même "cp").
// Choix explicite de l'utilisateur (voir README, "Pays couverts"), documenté comme tel plutôt que
// présenté comme un vrai code postal.
//
// Champ population très lacunaire dans le dump GeoNames syrien (guerre civile, cartographie
// difficile) : sur 10 816 lieux bruts (classe P, codes retenus), seulement 127 ont une population
// enregistrée ≥ 500 habitants — un seuil à 1000 habitants (126 lieux) a donc été choisi plutôt qu'une
// couverture exhaustive, qui aurait noyé les vraies villes sous des milliers de hameaux à population
// inconnue, de toute façon quasiment indiscernables les uns des autres sous un même code de
// gouvernorat.
const fs = require('fs');
const path = require('path');
// Corrections communes à tous les générateurs de lieux (audit n° 11) : noms nettoyés, lieux écartés, quasi-doublons —
// voir scripts/communes-corrections.js.
const { excludePlace, preparePlaceName, dropNearDuplicates } = require('./communes-corrections.js');

const KEEP_FEATURE_CODES = new Set(['PPL','PPLA','PPLA2','PPLA3','PPLA4','PPLA5','PPLC','PPLF','PPLG','PPLL','PPLS']);
const MIN_POP = 1000;

// GeoNames admin1CodesASCII.txt (download.geonames.org/export/dump/admin1CodesASCII.txt) -> code
// ISO 3166-2:SY officiel de chaque gouvernorat (liste ISO stable, standard depuis des décennies).
const ADMIN1_TO_ISO = {
  '01': 'SY-HA', // Al-Hasakah
  '02': 'SY-LA', // Latakia
  '03': 'SY-QU', // Quneitra
  '04': 'SY-RA', // Raqqa
  '05': 'SY-SU', // As-Suwayda
  '06': 'SY-DR', // Daraa
  '07': 'SY-DY', // Deir ez-Zor
  '08': 'SY-RD', // Rif Dimashq
  '09': 'SY-HL', // Aleppo (Halab)
  '10': 'SY-HM', // Hama
  '11': 'SY-HI', // Homs (Hims)
  '12': 'SY-ID', // Idlib
  '13': 'SY-DI', // Damascus (ville)
  '14': 'SY-TA'  // Tartus
  // "00" (18 lieux bruts) : code GeoNames non résolu dans admin1CodesASCII.txt pour la Syrie (zone
  // administrative ambiguë/non classée) — aucun code ISO fiable à lui associer, ces lieux sont donc
  // écartés (comme n'importe quelle commune sans "cp" ailleurs dans ce projet).
};

// Quatre corrections parmi les plus grandes villes du pays (échantillon des 20 plus peuplées, reste
// déjà en translittération BGN/PCGN de l'arabe — Ar Raqqah, Ḩamāh, Ţarţūs, Al Ḩasakah, Deir ez-Zor,
// Al Qāmishlī... déjà bons), toutes confirmées par la liste de noms alternatifs GeoNames de la même
// entrée : "Aleppo"/"Damascus"/"Homs"/"Latakia" sont des exonymes anglais/français, remplacés par la
// translittération arabe la plus proche déjà présente dans le dump — "Halab", "Damashq", "Hims",
// "Al Ladhiqiyah" — même logique que Rome->Roma/Vienna->Wien pour les autres pays de ce projet,
// l'arabe étant la seule langue nationale de la Syrie (voir README, "Langues").
const NAME_OVERRIDES = {
  'Aleppo': 'Halab',
  'Damascus': 'Damashq',
  'Homs': 'Hims',
  'Latakia': 'Al Ladhiqiyah'
};

const dumpRaw = fs.readFileSync(path.join(__dirname, 'dump', 'SY_dump.txt'), 'utf8');
const rows = dumpRaw.split('\n').filter(Boolean).map(line => line.split('\t'));
const places = rows
  .filter(c => c[6] === 'P' && KEEP_FEATURE_CODES.has(c[7]) && !excludePlace('SY', c[0], preparePlaceName('SY', c[0], c[1]), parseFloat(c[4]), parseFloat(c[5])))
  .map(c => ({
    name: preparePlaceName('SY', c[0], NAME_OVERRIDES[c[1]] || c[1]),
    lat: parseFloat(c[4]),
    lon: parseFloat(c[5]),
    admin1Code: c[10] || '',
    pop: parseInt(c[14], 10) || 0
  }))
  .filter(p => !isNaN(p.lat) && !isNaN(p.lon) && p.name && p.pop >= MIN_POP);

const seen = new Map();
for(const p of places){
  const key = p.name.toLowerCase() + '|' + p.lat.toFixed(2) + '|' + p.lon.toFixed(2);
  const existing = seen.get(key);
  if(!existing || p.pop > existing.pop) seen.set(key, p);
}
const deduped = Array.from(seen.values());

const lines = deduped.map(p => {
  const cp = ADMIN1_TO_ISO[p.admin1Code];
  if(!cp) return null;
  return `${p.pop};${p.lon.toFixed(4)},${p.lat.toFixed(4)};${cp};;${p.name}`;
}).filter(Boolean);

const outPath = path.join(__dirname, '..', 'public', 'data', 'communes-sy.txt');
fs.writeFileSync(outPath, dropNearDuplicates(lines).join('\n') + '\n', 'utf8'); // quasi-doublons (voir communes-corrections.js)
console.log('SY : ', rows.length, 'lignes brutes ->', places.length, 'avec pop >=', MIN_POP, '->',
  deduped.length, 'dédoublonnés ->', lines.length, 'avec gouvernorat ->', outPath);
