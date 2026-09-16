// Alias multilingues pour les quatre territoires traités par build-maghreb-communes.js (Maroc,
// Algérie, Tunisie, Sahara occidental). Le script standard build-aliases.js ne peut pas s'appliquer :
// il reconstruit lui-même son jeu de communes à partir de postal/XX_postal.txt, alors qu'aucun des
// quatre ne suit ce chemin (Maroc = codes de région ISO, Tunisie = jeu tiers, Sahara occidental =
// étiquette unique, Algérie = jointure postale avec contrôle de wilaya).
//
// Plutôt que de dupliquer cette logique de sélection — et de risquer qu'elle diverge silencieusement
// —, ce script repart du FICHIER DÉJÀ GÉNÉRÉ public/data/communes-xx.txt et retrouve le geonameid de
// chaque commune en la rapprochant du dump par nom + coordonnées arrondies (exactement la clé de
// dédoublonnage utilisée à la génération). L'ensemble des alias correspond donc, par construction, à
// ce qui est réellement publié.
//
// Utile surtout pour les noms corrigés vers leur forme locale (Algiers->Alger, Tangier->Tanger,
// Marrakesh->Marrakech, Fes->Fès, Laayoune->Laâyoune) : sans alias, un visiteur tapant la forme
// anglaise usuelle ne trouverait plus ces villes du tout.
const fs = require('fs');
const path = require('path');

const KEEP_FEATURE_CODES = new Set(['PPL','PPLA','PPLA2','PPLA3','PPLA4','PPLA5','PPLC','PPLF','PPLG','PPLL','PPLS']);
function norm(s){ return String(s || '').trim().toLowerCase().replace(/\s+/g, ' '); }

// Langues retenues pour la RECHERCHE. L'arabe est la langue officielle des quatre territoires et
// l'écriture dans laquelle un visiteur local saisira naturellement un nom de ville. "zgh" (amazighe
// standard marocain) et "kab" (kabyle) sont les deux langues amazighes ajoutées à l'interface dans ce
// même lot. "ber" est le code COLLECTIF ISO 639-2/639-5 des langues berbères, sous lequel GeoNames
// range une partie des noms en tifinagh sans préciser la variété : retenu pour la recherche
// uniquement, jamais comme langue d'interface — le projet n'affiche pas de famille de langues.
// L'espagnol et le français sont conservés pour les exonymes hérités, très courants dans la région.
const SUPPORTED_LANGS = new Set(['fr', 'en', 'es', 'de', 'it', 'nl', 'pt', 'ar', 'zgh', 'kab', 'ber', 'ru', 'tr']);

const COUNTRIES = ['MA', 'DZ', 'TN', 'EH'];

for(const country of COUNTRIES){
  // 1. communes réellement publiées -> clé "nom|lat|lon"
  const communesPath = path.join(__dirname, '..', 'public', 'data', 'communes-' + country.toLowerCase() + '.txt');
  const published = new Map();
  fs.readFileSync(communesPath, 'utf8').split('\n').filter(Boolean).forEach(line => {
    const parts = line.split(';');
    const lonlat = parts[1].split(',');
    const key = norm(parts[4]) + '|' + parseFloat(lonlat[1]).toFixed(2) + '|' + parseFloat(lonlat[0]).toFixed(2);
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
      // le nom publié peut être une correction d'exonyme : on teste le nom du dump ET, à défaut,
      // la seule entrée publiée aux mêmes coordonnées
      for(const candidate of [c[1]]){
        const key = norm(candidate) + '|' + lat.toFixed(2) + '|' + lon.toFixed(2);
        if(published.has(key)){ canonicalByGeonameId.set(c[0], published.get(key)); return; }
      }
      // exonyme corrigé : mêmes coordonnées, nom différent
      for(const [key, name] of published){
        const bits = key.split('|');
        if(bits[1] === lat.toFixed(2) && bits[2] === lon.toFixed(2)){
          canonicalByGeonameId.set(c[0], name);
          return;
        }
      }
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
    ' geonameid retrouvés -> ' + out.length + ' alias -> ' + outPath);
}
