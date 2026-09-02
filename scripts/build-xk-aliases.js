// Script ponctuel pour le Kosovo UNIQUEMENT (voir build-xk-communes.js pour le pourquoi du pipeline
// séparé — pas de fichier de codes postaux GeoNames pour ce pays). Reprend canonicalByGeonameId
// depuis build-xk-communes.js (déjà restreint aux communes ayant survécu au rapprochement), même
// principe que canonicalByGeonameId dans build-aliases.js/build-ba-aliases.js/build-me-aliases.js.
const fs = require('fs');
const path = require('path');

// Les 47 langues actuellement couvertes par l'interface (voir public/js/i18n.js, SUPPORTED).
const SUPPORTED_LANGS = new Set(['fr', 'en', 'es', 'pt', 'nl', 'de', 'lb', 'it', 'rm', 'nds', 'hsb', 'frr', 'sc', 'fur', 'lld', 'mt', 'lij', 'nrf-je', 'nrf-gg', 'csb', 'rue', 'ruo', 'ca', 'eu', 'gl', 'oc', 'br', 'co', 'mwl', 'ga', 'gv', 'cy', 'gd', 'kw', 'sco', 'cs', 'pl', 'sk', 'hu', 'sl', 'hr', 'bs', 'sr', 'da', 'no', 'sv', 'fi', 'sq', 'cnr']);
const LANG_OUTPUT_REMAP = { dsb: 'hsb' };

function normalize(s){
  return String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const canonicalByGeonameId = JSON.parse(fs.readFileSync(path.join(__dirname, 'xk-canonical-by-geonameid.json'), 'utf8'));
const altRaw = fs.readFileSync(path.join(__dirname, 'altnames', 'XK.txt'), 'utf8');
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

const outPath = path.join(__dirname, '..', 'public', 'data', 'aliases-xk.txt');
fs.writeFileSync(outPath, out.join('\n') + (out.length ? '\n' : ''), 'utf8');
console.log('XK :', Object.keys(canonicalByGeonameId).length, 'communes couvertes ->', out.length, 'alias ->', outPath);
