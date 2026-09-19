// Script ponctuel pour les VINGT-QUATRE pays d'Afrique orientale, centrale et australe et de l'océan
// Indien ajoutés dans le même passage : Kenya, Ouganda, Tanzanie, Rwanda, Burundi, RD Congo, Congo,
// Gabon, Guinée équatoriale, Sao Tomé-et-Principe, Angola, Zambie, Malawi, Mozambique, Zimbabwe,
// Botswana, Namibie, Afrique du Sud, Eswatini, Lesotho, Comores, Madagascar, Maurice, Seychelles.
// Même méthode, même format et mêmes règles que build-sahel-corne-communes.js et
// build-westafrica-communes.js — le champ "cp" porte une étiquette "XX-<code admin1 GeoNames>",
// informelle, qui n'est PAS un code ISO 3166-2.
//
// DIFFÉRENCE avec les deux lots précédents — lieux SANS division administrative connue (code "00",
// vide, ou code absent d'admin1CodesASCII.txt) : GARDÉS, avec l'étiquette pays seule ("XX") et une
// région vide, exactement comme le Sahara occidental. Les écarter, comme en Afrique de l'Ouest où
// ils n'étaient que des hameaux sans population, aurait ici vidé des pays entiers — mesuré :
// Guinée équatoriale 1 965 lieux sur 2 045 (il n'en serait resté que 80), Lesotho 239 sur 393 dont
// des bourgs peuplés (Mantsebo 9 216 hab., Mamathes 8 058, Thabana Morena 5 970), Mozambique 1 480,
// Angola 517, Botswana 174 dont Mabuli (1 665 hab.). Aucune région n'est devinée : le champ reste vide.
//
// CODES POSTAUX : GeoNames n'en publie que pour TROIS des vingt-quatre (Kenya, Malawi, Afrique du
// Sud ; export/zip/XX.zip -> 404 pour les vingt et un autres, vérifié un par un). Mesurés avant de
// trancher (rapprochement de chaque lieu au point postal le plus proche) et ÉCARTÉS tous les trois :
// - Afrique du Sud : 3 920 codes mais seulement 906 coordonnées distinctes (les 135 codes de
//   Johannesburg partagent un même point) — le « plus proche » serait un tirage arbitraire entre
//   codes superposés ; et seulement 6 442 lieux sur 12 613 ont un point postal à moins de 15 km.
// - Kenya (890 codes) et Malawi (491 codes, 242 coordonnées distinctes) : codes de BUREAUX DE POSTE
//   (boîtes postales), pas d'adresses ; au Malawi 1 976 lieux sur 7 957 seulement à moins de 5 km.
// Mélanger vrais codes et étiquettes admin1 selon la distance produirait un champ incohérent : les
// trois pays suivent la même règle que les vingt et un autres.
//
// LA RÉUNION et MAYOTTE ne sont PAS construites ici : départements français, leurs communes
// viennent déjà de geo.api.gouv.fr avec leurs vrais codes postaux (974xx, 976xx) dans communes.txt.

const fs = require('fs');
const path = require('path');
const { excludePlace, preparePlaceName, dropNearDuplicates } = require('./communes-corrections.js'); // lieux mal rangés, disparus, Sercq, Antarctique (voir ce fichier)

const COUNTRIES = ['KE', 'UG', 'TZ', 'RW', 'BI', 'CD', 'CG', 'GA', 'GQ', 'ST', 'AO', 'ZM', 'MW', 'MZ', 'ZW', 'BW', 'NA', 'ZA', 'SZ', 'LS', 'KM', 'MG', 'MU', 'SC'];
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
    .filter(c => c[6] === 'P' && KEEP_FEATURE_CODES.has(c[7]) && !excludePlace(country, c[0], preparePlaceName(country, c[0], overrides[c[1]] || c[1]), parseFloat(c[4]), parseFloat(c[5]))) // 13e audit du 19/09/2026 : filtre sur le nom publié (renommages compris), voir communes-corrections.js
    .map(c => ({
      name: preparePlaceName(country, c[0], overrides[c[1]] || c[1]),
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
  const lines = dropNearDuplicates(deduped.map(p => {
    const region = (p.admin1 && p.admin1 !== '00') ? (admin1Names.get(country + '.' + p.admin1) || '') : '';
    if(!region){
      sansRegion++;
      return `${p.pop};${p.lon.toFixed(4)},${p.lat.toFixed(4)};${country};;${p.name}`;
    }
    return `${p.pop};${p.lon.toFixed(4)},${p.lat.toFixed(4)};${country}-${p.admin1};${region};${p.name}`;
  }));

  const out = path.join(__dirname, '..', 'public', 'data', 'communes-' + country.toLowerCase() + '.txt');
  fs.writeFileSync(out, lines.join('\n') + '\n', 'utf8');
  summary.push({ country, brut: places.length, dedup: deduped.length, sansRegion, retenus: lines.length });
  console.log(country + ' : ' + places.length + ' bruts -> ' + deduped.length + ' dédoublonnés -> ' +
    lines.length + ' retenus (dont ' + sansRegion + ' sans division administrative, étiquette pays seule)');
}

console.log('\nTOTAL : ' + summary.reduce((a, s) => a + s.retenus, 0) + ' communes pour ' + COUNTRIES.length + ' pays');
