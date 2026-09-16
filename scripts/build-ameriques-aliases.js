// Alias multilingues des 50 territoires d'AMÉRIQUE (build-ameriques-communes.js). Même méthode que build-golfe-aliases.js :
// rapprochement nom + coordonnées à 4 décimales sur le fichier publié.
const fs = require('fs');
const path = require('path');

const COUNTRIES = ['US', 'CA', 'MX', 'GL', 'BM', 'GT', 'BZ', 'SV', 'HN', 'NI', 'CR', 'PA', 'CU', 'JM', 'HT', 'DO', 'BS', 'KN', 'AG', 'DM', 'LC', 'VC', 'BB', 'GD', 'TT', 'PR', 'VI', 'TC', 'KY', 'VG', 'AI', 'MS', 'AW', 'CW', 'SX', 'BQ', 'CO', 'VE', 'GY', 'SR', 'EC', 'PE', 'BO', 'BR', 'PY', 'UY', 'AR', 'CL', 'FK', 'GS'];
const KEEP_FEATURE_CODES = new Set(['PPL','PPLA','PPLA2','PPLA3','PPLA4','PPLA5','PPLC','PPLF','PPLG','PPLL','PPLS']);
function norm(s){ return String(s || '').trim().toLowerCase().replace(/\s+/g, ' '); }

// Langues retenues pour la RECHERCHE : langues des territoires (anglais, espagnol, portugais, français, néerlandais,
// papiamento, créoles, langues autochtones : quechua, aymara, guarani, náhuatl, maya, groenlandais, inuktitut, hawaïen…)
// plus les grandes langues déjà gérées.
const SUPPORTED_LANGS = new Set([
  'fr', 'en', 'es', 'pt', 'nl', 'de', 'it', 'ru', 'zh', 'zh-Hans', 'zh-Hant', 'ja', 'ko', 'ar', 'hi',
  'pap', 'ht', 'srn', 'qu', 'quz', 'qug', 'ay', 'gn', 'gug', 'nah', 'nhe', 'yua', 'kl', 'iu', 'ike', 'cr', 'haw', 'nv', 'chr',
  'arn', 'rap', 'guc', 'jam', 'bzj', 'kek', 'quc', 'cak', 'mam', 'miq', 'lkt', 'dak', 'moh', 'oj'
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
