// Script ponctuel pour la Grèce UNIQUEMENT (voir build-gr-communes.js pour le pourquoi du pipeline
// séparé — pas de fichier de codes postaux GeoNames pour ce pays). Reprend canonicalByGeonameId
// depuis build-gr-communes.js (déjà restreint aux communes ayant survécu au rapprochement, même
// principe que canonicalByGeonameId dans build-aliases.js/build-me-aliases.js).
const fs = require('fs');
const path = require('path');

// Les langues actuellement couvertes par l'interface (voir public/js/i18n.js, SUPPORTED) — tenu à
// jour manuellement à chaque nouvelle langue, comme build-aliases.js/build-me-aliases.js. Inclut le
// grec (el) lui-même : ses propres noms alternatifs en alphabet grec (ex. "Αθήνα" pour "Athína")
// sont une source de recherche précieuse, pas juste les traductions dans d'autres langues.
const SUPPORTED_LANGS = new Set(['fr', 'en', 'es', 'pt', 'nl', 'de', 'lb', 'it', 'rm', 'nds', 'hsb', 'frr', 'sc', 'fur', 'lld', 'mt', 'lij', 'nrf-je', 'nrf-gg', 'csb', 'rue', 'ruo', 'ca', 'eu', 'gl', 'oc', 'br', 'co', 'mwl', 'ga', 'gv', 'cy', 'gd', 'kw', 'sco', 'cs', 'pl', 'sk', 'hu', 'sl', 'hr', 'bs', 'sr', 'da', 'no', 'sv', 'fi', 'sq', 'cnr', 'mk', 'ro', 'el', 'bg']);
const LANG_OUTPUT_REMAP = { dsb: 'hsb' };

function normalize(s){
  return String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const canonicalByGeonameId = JSON.parse(fs.readFileSync(path.join(__dirname, 'gr-canonical-by-geonameid.json'), 'utf8'));
const altRaw = fs.readFileSync(path.join(__dirname, 'altnames', 'GR.txt'), 'utf8');
const aliasRows = altRaw.split('\n').filter(Boolean).map(line => line.split('\t'));
const seenAlias = new Set();
const out = [];
for(const c of aliasRows){
  const geonameid = c[1], rawLang = c[2], alt = c[3], isHistoric = c[7];
  const lang = LANG_OUTPUT_REMAP[rawLang] || rawLang;
  if(!SUPPORTED_LANGS.has(lang)) continue;
  if(isHistoric === '1') continue;
  const canonical = canonicalByGeonameId[geonameid];
  if(!canonical || !alt) continue;
  if(normalize(alt) === normalize(canonical)) continue;
  const dedupeKey = lang + '|' + normalize(alt) + '|' + canonical;
  if(seenAlias.has(dedupeKey)) continue;
  seenAlias.add(dedupeKey);
  out.push(`${lang};${alt};${canonical}`);
}

const outPath = path.join(__dirname, '..', 'public', 'data', 'aliases-gr.txt');
fs.writeFileSync(outPath, out.join('\n') + (out.length ? '\n' : ''), 'utf8');
console.log('GR :', Object.keys(canonicalByGeonameId).length, 'communes couvertes ->', out.length, 'alias ->', outPath);
