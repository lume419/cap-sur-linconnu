// Script ponctuel (septembre 2026) : péninsule Arabique, Irak et Iran — Arabie saoudite, Bahreïn,
// Émirats arabes unis, Irak, Iran, Koweït, Oman, Qatar, Yémen. Même méthode que
// build-afrique-australe-communes.js (voir son en-tête) : étiquette "XX-<admin1 GeoNames>", informelle,
// lieux sans région gardés avec l'étiquette pays seule.
//
// CODES POSTAUX : GeoNames n'en publie pour aucun des neuf, SAUF un fichier AE.zip qui n'en contient
// pas : ses 178 171 lignes sont des numéros d'adresse de bâtiments de Dubaï (système Makani, deux
// nombres à 5 chiffres, ex. « 28119 95762 », précision 6), pas des codes postaux — les Émirats n'ont
// pas de système de codes postaux. Écarté.

const fs = require('fs');
const path = require('path');

const COUNTRIES = ['SA', 'BH', 'AE', 'IQ', 'IR', 'KW', 'OM', 'QA', 'YE'];
const KEEP_FEATURE_CODES = new Set(['PPL','PPLA','PPLA2','PPLA3','PPLA4','PPLA5','PPLC','PPLF','PPLG','PPLL','PPLS']);

// Corrections d'exonymes : chacune vérifiée dans les noms alternatifs GeoNames de L'ENTRÉE ELLE-MÊME
// (champ de langue "fr" ou "pt" selon la langue officielle du pays), jamais d'après une connaissance
// générale — même méthode que pour la Turquie, la Syrie et le Maghreb.
const NAME_OVERRIDES_BY_COUNTRY = {};

// Île de Dalma (Abou Dhabi) : GeoNames n'y recense aucun lieu habité de type PPL — la ville y est décrite par
// trois quartiers (PPLX 12749362 « Shabiat Dalma », 12748416 « Shabiat Dalma Al Jadeedah », 12749423 « Shabiat
// Dalma Al Jabel ») et par la division administrative de l'île (ADM3 12748078 « Dalma Island »). Ces quatre
// entrées sont reprises telles quelles (septembre 2026) : sans elles, l'île n'avait aucun lieu, et « Dalma
// Island » rend l'île trouvable en tapant « Dalma ». Même démarche que pour les îles Éparses et Heard.
const EXTRA_GEONAME_IDS = { AE: new Set(['12749362', '12748416', '12749423', '12748078']) };

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
    .filter(c => (c[6] === 'P' && KEEP_FEATURE_CODES.has(c[7])) || (EXTRA_GEONAME_IDS[country] && EXTRA_GEONAME_IDS[country].has(c[0])))
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
    const region = (p.admin1 && p.admin1 !== '00') ? (admin1Names.get(country + '.' + p.admin1) || '') : '';
    if(!region){
      sansRegion++;
      return `${p.pop};${p.lon.toFixed(4)},${p.lat.toFixed(4)};${country};;${p.name}`;
    }
    return `${p.pop};${p.lon.toFixed(4)},${p.lat.toFixed(4)};${country}-${p.admin1};${region};${p.name}`;
  });

  const out = path.join(__dirname, '..', 'public', 'data', 'communes-' + country.toLowerCase() + '.txt');
  fs.writeFileSync(out, lines.join('\n') + '\n', 'utf8');
  summary.push({ country, brut: places.length, dedup: deduped.length, sansRegion, retenus: lines.length });
  console.log(country + ' : ' + places.length + ' bruts -> ' + deduped.length + ' dédoublonnés -> ' +
    lines.length + ' retenus (dont ' + sansRegion + ' sans division administrative, étiquette pays seule)');
}

console.log('\nTOTAL : ' + summary.reduce((a, s) => a + s.retenus, 0) + ' communes pour ' + COUNTRIES.length + ' pays');
