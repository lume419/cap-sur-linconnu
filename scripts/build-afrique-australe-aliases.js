// Alias multilingues pour les vingt-quatre pays d'Afrique orientale, centrale et australe et de l'océan
// Indien traités par build-afrique-australe-communes.js. Même principe que build-sahel-corne-aliases.js :
// ce script repart du fichier public/data/communes-xx.txt DÉJÀ GÉNÉRÉ et retrouve le geonameid de
// chaque commune en la rapprochant du dump par nom + coordonnées à 4 décimales (la précision exacte du
// fichier publié — voir le correctif d'arrondi documenté dans le README).
const fs = require('fs');
const path = require('path');

const COUNTRIES = ['KE', 'UG', 'TZ', 'RW', 'BI', 'CD', 'CG', 'GA', 'GQ', 'ST', 'AO', 'ZM', 'MW', 'MZ', 'ZW', 'BW', 'NA', 'ZA', 'SZ', 'LS', 'KM', 'MG', 'MU', 'SC'];
const KEEP_FEATURE_CODES = new Set(['PPL','PPLA','PPLA2','PPLA3','PPLA4','PPLA5','PPLC','PPLF','PPLG','PPLL','PPLS']);
function norm(s){ return String(s || '').trim().toLowerCase().replace(/\s+/g, ' '); }

// Langues retenues pour la RECHERCHE uniquement : langues officielles ou de travail du lot (anglais,
// français, portugais, espagnol, arabe) et les langues africaines sous lesquelles GeoNames range des
// noms de lieux de ces pays : swahili, kinyarwanda, kirundi, luganda, lingala, kikongo, tshiluba et
// luba-katanga, malgache, afrikaans, zoulou, xhosa, sotho du Sud et du Nord, tswana, swati, venda,
// tsonga, ndébélé du Sud et du Nord, shona, chichewa, kikuyu, tumbuka, créoles seychellois et
// mauricien. Qu'une langue serve à la recherche ne préjuge pas de son ajout à l'interface (README).
const SUPPORTED_LANGS = new Set([
  'fr', 'en', 'ar', 'de', 'it', 'es', 'pt', 'nl',
  'sw', 'rw', 'rn', 'lg', 'ln', 'kg', 'lua', 'lu', 'mg', 'af', 'zu', 'xh', 'st', 'nso', 'tn', 'ss',
  've', 'ts', 'nr', 'nd', 'sn', 'ny', 'ki', 'tum', 'crs', 'mfe'
]);

for(const country of COUNTRIES){
  // 1. communes réellement publiées -> clé "nom|lat|lon"
  const communesPath = path.join(__dirname, '..', 'public', 'data', 'communes-' + country.toLowerCase() + '.txt');
  const published = new Map();
  fs.readFileSync(communesPath, 'utf8').split('\n').filter(Boolean).forEach(line => {
    const parts = line.split(';');
    const lonlat = parts[1].split(',');
    const key = norm(parts[4]) + '|' + parseFloat(lonlat[1]).toFixed(4) + '|' + parseFloat(lonlat[0]).toFixed(4);
    published.set(key, parts[4]);
  });

  // 2. dump -> geonameid des lieux publiés
  const canonicalByGeonameId = new Map();
  fs.readFileSync(path.join(__dirname, 'dump', country + '_dump.txt'), 'utf8')
    .split('\n').filter(Boolean).map(l => l.split('\t'))
    .filter(c => c[6] === 'P' && KEEP_FEATURE_CODES.has(c[7]))
    .forEach(c => {
      const lat = parseFloat(c[4]), lon = parseFloat(c[5]);
      if(isNaN(lat) || isNaN(lon)) return;
      const key = norm(c[1]) + '|' + lat.toFixed(4) + '|' + lon.toFixed(4);
      if(published.has(key)) canonicalByGeonameId.set(c[0], published.get(key));
    });

  // 3. noms alternatifs
  const altPath = path.join(__dirname, 'altnames', country + '.txt');
  const out = [];
  const seenAlias = new Set();
  if(fs.existsSync(altPath)){
    fs.readFileSync(altPath, 'utf8').split('\n').filter(Boolean).map(l => l.split('\t')).forEach(c => {
      const geonameid = c[1], lang = c[2], alt = c[3], isHistoric = c[7];
      if(!SUPPORTED_LANGS.has(lang) || isHistoric === '1' || !alt) return;
      const canonical = canonicalByGeonameId.get(geonameid);
      if(!canonical || norm(alt) === norm(canonical)) return;
      const k = lang + '|' + norm(alt) + '|' + canonical;
      if(seenAlias.has(k)) return;
      seenAlias.add(k);
      out.push(`${lang};${alt};${canonical}`);
    });
  }
  const outPath = path.join(__dirname, '..', 'public', 'data', 'aliases-' + country.toLowerCase() + '.txt');
  fs.writeFileSync(outPath, out.join('\n') + (out.length ? '\n' : ''), 'utf8');
  console.log(country + ' : ' + published.size + ' communes publiées, ' + canonicalByGeonameId.size +
    ' geonameid retrouvés -> ' + out.length + ' alias');
}
