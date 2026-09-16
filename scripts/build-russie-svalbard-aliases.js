// Alias multilingues de la RUSSIE et du SVALBARD ET JAN MAYEN (build-russie-svalbard-communes.js). Même
// méthode que build-afrique-australe-aliases.js : rapprochement nom + coordonnées à 4 décimales sur le
// fichier publié. Le russe en cyrillique y est essentiel : GeoNames range les noms de lieux russes en
// translittération latine (« Moscow », « Noyabrsk ») ; sans alias « ru », taper « Москва » ne trouverait rien.
const fs = require('fs');
const path = require('path');

const COUNTRIES = ['RU', 'SJ'];
const KEEP_FEATURE_CODES = new Set(['PPL','PPLA','PPLA2','PPLA3','PPLA4','PPLA5','PPLC','PPLF','PPLG','PPLL','PPLS']);
function norm(s){ return String(s || '').trim().toLowerCase().replace(/\s+/g, ' '); }

// Langues retenues pour la RECHERCHE : russe et langues européennes déjà gérées, langues des pays
// voisins, et les langues des républiques de la Fédération sous lesquelles GeoNames range des noms de
// lieux (tatar, bachkir, tchouvache, tchétchène, ossète, iakoute, avar, komi, oudmourte, mari, erzya,
// moksha, karatchaï-balkar, kabarde, adyguéen, ingouche, lezghien, kalmouk, touvain, bouriate, altaï,
// khakasse, carélien, vepse). Norvégien pour le Svalbard.
const SUPPORTED_LANGS = new Set([
  'fr', 'en', 'de', 'it', 'es', 'pt', 'nl', 'pl', 'fi', 'et', 'lv', 'lt', 'no', 'nb', 'nn', 'sv',
  'ru', 'uk', 'be', 'ka', 'az', 'kk', 'crh', 'ab', 'ady',
  'tt', 'ba', 'cv', 'ce', 'os', 'sah', 'av', 'kv', 'koi', 'udm', 'mhr', 'mrj', 'myv', 'mdf', 'krc', 'kbd',
  'inh', 'lez', 'xal', 'tyv', 'bxr', 'alt', 'kjh', 'krl', 'vep'
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
