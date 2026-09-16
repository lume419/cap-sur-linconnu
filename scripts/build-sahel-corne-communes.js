// Script ponctuel pour les ONZE pays du Sahel, d'Afrique centrale et de la Corne de l'Afrique
// ajoutés dans le même passage : Niger, Bénin, Nigeria, Tchad, République centrafricaine, Soudan,
// Soudan du Sud, Érythrée, Éthiopie, Djibouti, Somalie. Même méthode, même format et mêmes règles
// que build-westafrica-communes.js — voir son en-tête pour le détail, résumé ici :
//
// - AUCUN fichier de codes postaux GeoNames pour aucun des onze (export/zip/XX.zip -> 404 vérifié
//   un par un). Le champ "cp" porte une étiquette "XX-<code admin1 GeoNames>", informelle, qui
//   n'est PAS un code ISO 3166-2.
// - Lieux sans division administrative, ou portant un code admin1 absent d'admin1CodesASCII.txt :
//   écartés. Mesuré avant de trancher : aucun n'a de population renseignée, sauf un à Djibouti.
//   Les codes inconnus sont des codes OBSOLÈTES restés dans des fiches GeoNames non mises à jour
//   après des réformes territoriales — Éthiopie 156 lieux (création de Sidama en 2020, du Sud-Ouest
//   en 2021, partage de la région des Nations du Sud en 2023), Soudan 41 lieux, Soudan du Sud 1.
//   Les rattacher à la main à une région actuelle serait une reconstruction non sourcée.
// - Somalie : GeoNames range le Somaliland (indépendant de fait depuis 1991, non reconnu
//   internationalement) sous le code SO. Repris TEL QUEL, sans retouche éditoriale politique —
//   même principe que le Sahara occidental, le nord de Chypre, le Kosovo et la Crimée.

const fs = require('fs');
const path = require('path');

const COUNTRIES = ['NE', 'BJ', 'NG', 'TD', 'CF', 'SD', 'SS', 'ER', 'ET', 'DJ', 'SO'];
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
    .filter(c => c[6] === 'P' && KEEP_FEATURE_CODES.has(c[7]))
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
