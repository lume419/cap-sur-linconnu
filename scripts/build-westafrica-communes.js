// Script ponctuel pour les TREIZE pays d'Afrique de l'Ouest ajoutés dans le même passage :
// Mauritanie, Mali, Sénégal, Gambie, Cap-Vert, Guinée, Guinée-Bissau, Sierra Leone, Liberia,
// Burkina Faso, Côte d'Ivoire, Ghana, Togo. Format de sortie identique aux autres pays :
// population;lon,lat;cp1,cp2,...;region;nom
//
// ── AUCUN CODE POSTAL, POUR AUCUN DES TREIZE ───────────────────────────────────────────────────
// Vérifié un par un : export/zip/{MR,ML,SN,GM,CV,GN,GW,SL,LR,BF,CI,GH,TG}.zip -> 404 pour les
// treize. C'est le plus gros lot du projet sans la moindre source de codes postaux, et contrairement
// au Maghreb aucun jeu tiers exploitable n'a été retenu : à cette échelle (treize pays), valider la
// couverture et la fiabilité d'autant de jeux non officiels aurait demandé autant de travail que le
// reste du lot, pour un risque d'erreur silencieuse bien plus élevé — le même raisonnement qui avait
// fait préférer le repli par gouvernorat pour l'Égypte.
//
// Le champ "cp" porte donc une étiquette de région, construite comme "XX-<code admin1 GeoNames>".
// ATTENTION, ce n'est PAS un code ISO 3166-2, et c'est délibéré : les codes admin1 de GeoNames
// coïncident avec l'ISO pour certains pays de ce lot (Burkina Faso 01-13) mais pas pour d'autres
// (le Ghana utilise des lettres en ISO — GH-AA, GH-AH… — là où GeoNames numérote ; la Guinée
// mélange chiffres et lettres). Construire à la main treize tables de correspondance vers l'ISO
// aurait multiplié les occasions de se tromper sans rien apporter au visiteur, à qui le NOM de la
// région est de toute façon montré à côté. Le code GeoNames est donc repris TEL QUEL, étiqueté comme
// informel — même principe que les étiquettes "PS-WBK"/"PS-GZA" et "EH" des lots précédents.
// Le champ "region" porte le nom de la division tel que GeoNames le publie (admin1CodesASCII.txt).
//
// ── LIEUX SANS DIVISION ADMINISTRATIVE ─────────────────────────────────────────────────────────
// Écartés, comme le pipeline standard écarte les communes sans code postal. Mesuré avant de trancher
// pour vérifier que cela ne coûtait rien de réel : les lieux concernés n'ont, à une poignée près,
// AUCUNE population renseignée. Mali 1 157 lieux sans admin1 dont 0 avec population ; Togo 3 443 dont
// 0 ; Guinée-Bissau 3 183 dont 7. Partout ailleurs le trou est négligeable (0 à 68 lieux).
// Ce sont des hameaux sans population connue, pas des destinations perdues.
//
// ── CAP-VERT : UN ARCHIPEL ─────────────────────────────────────────────────────────────────────
// Seul pays insulaire du lot, et le premier du projet dont TOUT le territoire est morcelé. Les neuf
// îles habitées sont identifiées par COORDONNÉES dans lib/trip-engine.js (landmassOf), pas ici — ce
// fichier ne fait que produire les communes. Deux concelhos portent un nom presque identique sur deux
// îles différentes (Santa Catarina sur Santiago, Santa Catarina do Fogo sur Fogo) : c'est précisément
// pour cela que le rattachement se fait par coordonnées et jamais par nom.
const fs = require('fs');
const path = require('path');
const { excludePlace } = require('./communes-corrections.js'); // lieux mal rangés, disparus, Sercq, Antarctique (voir ce fichier)

const COUNTRIES = ['MR', 'ML', 'SN', 'GM', 'CV', 'GN', 'GW', 'SL', 'LR', 'BF', 'CI', 'GH', 'TG'];
const KEEP_FEATURE_CODES = new Set(['PPL','PPLA','PPLA2','PPLA3','PPLA4','PPLA5','PPLC','PPLF','PPLG','PPLL','PPLS']);

// Corrections d'exonymes : chacune vérifiée dans les noms alternatifs GeoNames de L'ENTRÉE ELLE-MÊME
// (champ de langue "fr" ou "pt" selon la langue officielle du pays), jamais d'après une connaissance
// générale — même méthode que pour la Turquie, la Syrie et le Maghreb.
const NAME_OVERRIDES_BY_COUNTRY = {};

// Noms des divisions, repris d'admin1CodesASCII.txt (GeoNames) sans réécriture.
function readAdmin1Names(){
  const map = new Map();
  fs.readFileSync(path.join(__dirname, 'admin1CodesASCII.txt'), 'utf8').split('\n').forEach(l => {
    const f = l.split('\t');
    if(f[0] && f[1]) map.set(f[0], f[1]);
  });
  return map;
}

const admin1Names = readAdmin1Names();
const summary = [];

for(const country of COUNTRIES){
  const overrides = NAME_OVERRIDES_BY_COUNTRY[country] || {};
  const raw = fs.readFileSync(path.join(__dirname, 'dump', country + '_dump.txt'), 'utf8');
  const places = raw.split('\n').filter(Boolean).map(l => l.split('\t'))
    .filter(c => c[6] === 'P' && KEEP_FEATURE_CODES.has(c[7]) && !excludePlace(country, c[0], c[1], parseFloat(c[4]), parseFloat(c[5])))
    .map(c => ({
      name: overrides[c[1]] || c[1],
      lat: parseFloat(c[4]), lon: parseFloat(c[5]),
      admin1: c[10] || '', pop: parseInt(c[14], 10) || 0
    }))
    .filter(p => !isNaN(p.lat) && !isNaN(p.lon) && p.name);

  // Dédoublonnage identique au pipeline standard : même nom + coordonnées à ~1 km près.
  const seen = new Map();
  for(const p of places){
    const k = p.name.toLowerCase() + '|' + p.lat.toFixed(2) + '|' + p.lon.toFixed(2);
    const prev = seen.get(k);
    if(!prev || p.pop > prev.pop) seen.set(k, p);
  }
  const deduped = Array.from(seen.values());

  let sansRegion = 0;
  const lines = deduped.map(p => {
    if(!p.admin1 || p.admin1 === '00'){ sansRegion++; return null; }
    const region = admin1Names.get(country + '.' + p.admin1) || '';
    if(!region){ sansRegion++; return null; }
    return `${p.pop};${p.lon.toFixed(4)},${p.lat.toFixed(4)};${country}-${p.admin1};${region};${p.name}`;
  }).filter(Boolean);

  const out = path.join(__dirname, '..', 'public', 'data', 'communes-' + country.toLowerCase() + '.txt');
  fs.writeFileSync(out, lines.join('\n') + '\n', 'utf8');
  summary.push({ country, brut: places.length, dedup: deduped.length, sansRegion, retenus: lines.length });
  console.log(country + ' : ' + places.length + ' bruts -> ' + deduped.length + ' dédoublonnés -> ' +
    lines.length + ' retenus (' + sansRegion + ' sans division administrative)');
}

console.log('\nTOTAL : ' + summary.reduce((a, s) => a + s.retenus, 0) + ' communes pour ' + COUNTRIES.length + ' pays');
