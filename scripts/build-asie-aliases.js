// Alias multilingues des 35 territoires d'ASIE (build-asie-communes.js). Même méthode que build-golfe-aliases.js :
// rapprochement nom + coordonnées à 4 décimales sur le fichier publié. GeoNames range les noms en translittération
// latine : les alias dans l'écriture de chaque pays (hanzi, kana/kanji, hangeul, devanagari, thaï…) sont
// indispensables à la recherche.
const fs = require('fs');
const path = require('path');

const COUNTRIES = ['AF', 'KZ', 'KG', 'UZ', 'TJ', 'TM', 'BD', 'BT', 'IN', 'MV', 'NP', 'PK', 'LK', 'IO', 'CN', 'HK', 'MO', 'KP', 'KR', 'JP', 'MN', 'TW', 'BN', 'KH', 'ID', 'LA', 'MY', 'MM', 'PH', 'SG', 'TH', 'TL', 'VN', 'CX', 'CC'];
const KEEP_FEATURE_CODES = new Set(['PPL','PPLA','PPLA2','PPLA3','PPLA4','PPLA5','PPLC','PPLF','PPLG','PPLL','PPLS']);
function norm(s){ return String(s || '').trim().toLowerCase().replace(/\s+/g, ' '); }

// Langues retenues pour la RECHERCHE : langues des 35 territoires et de leurs régions, plus les langues
// européennes et voisines déjà gérées.
const SUPPORTED_LANGS = new Set([
  'fr', 'en', 'de', 'it', 'es', 'pt', 'nl', 'ru', 'tr', 'ar', 'fa',
  'zh', 'zh-Hans', 'zh-Hant', 'zh-TW', 'zh-HK', 'yue', 'ja', 'ko', 'mn', 'bo', 'ug', 'za',
  'hi', 'bn', 'ur', 'ta', 'te', 'ml', 'kn', 'mr', 'gu', 'pa', 'or', 'as', 'ne', 'si', 'dv', 'dz', 'sd', 'ps', 'prs', 'bal',
  'kk', 'ky', 'uz', 'tg', 'tk', 'kaa',
  'th', 'lo', 'km', 'my', 'shn', 'vi', 'id', 'ms', 'jv', 'su', 'tl', 'fil', 'ceb', 'tet'
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
