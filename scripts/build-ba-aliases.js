// Script ponctuel pour la Bosnie-Herzégovine UNIQUEMENT (voir build-ba-communes.js pour le pourquoi
// du pipeline séparé — pas de fichier de codes postaux GeoNames pour ce pays). Reprend
// canonicalByGeonameId depuis build-ba-communes.js (déjà restreint aux communes ayant survécu au
// rapprochement Wikipedia, exactement le même principe que canonicalByGeonameId dans
// build-aliases.js) plutôt que de refaire la jointure ici.
const fs = require('fs');
const path = require('path');

// Mêmes langues déjà couvertes par l'interface que pour tous les autres pays (voir
// build-aliases.js) — aucune nouvelle langue pour la Bosnie-Herzégovine (voir README, section
// "Langues" : les trois langues déjà couvertes pertinentes ici, allemand/italien/ruthène, en
// profitent automatiquement sans changement de code).
const SUPPORTED_LANGS = new Set(['fr', 'en', 'es', 'pt', 'nl', 'de', 'lb', 'it', 'rm', 'nds', 'hsb', 'frr', 'sc', 'fur', 'lld', 'mt', 'lij', 'nrf-je', 'nrf-gg', 'csb', 'rue', 'ruo']);
const LANG_OUTPUT_REMAP = { dsb: 'hsb' };

function normalize(s){
  return String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const canonicalByGeonameId = JSON.parse(fs.readFileSync(path.join(__dirname, 'ba-canonical-by-geonameid.json'), 'utf8'));
const altRaw = fs.readFileSync(path.join(__dirname, 'altnames', 'BA.txt'), 'utf8');
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

const outPath = path.join(__dirname, '..', 'public', 'data', 'aliases-ba.txt');
fs.writeFileSync(outPath, out.join('\n') + (out.length ? '\n' : ''), 'utf8');
console.log('BA :', Object.keys(canonicalByGeonameId).length, 'communes couvertes ->', out.length, 'alias ->', outPath);
