// Construit public/data/aliases-XX.txt : correspondances "nom dans une autre langue -> nom
// canonique" pour les communes andorranes/espagnoles/portugaises/belges/néerlandaises/
// luxembourgeoises/suisses/allemandes, à partir du fichier
// GeoNames alternateNamesV2 (download.geonames.org/export/dump/alternatenames/XX.zip — mêmes
// données que le dump utilisé par build-country-communes.js, mais avec les noms alternatifs
// étiquetés par langue ISO, justement conçues pour ce genre de besoin). Permet de saisir une ville
// dans la langue choisie pour l'interface (ex. "Anvers" en français pour la commune belge stockée
// sous son nom néerlandais "Antwerpen" — voir js/app.js, searchCommunes) plutôt que seulement son
// nom local.
//
// La France n'est PAS couverte ici : ses communes viennent de geo.api.gouv.fr (IGN/Etalab), pas de
// GeoNames — aucun geonameid n'est disponible pour les y relier. Les grandes villes françaises ont
// de toute façon presque toujours le même nom d'une langue à l'autre (Paris, Lyon, Marseille...),
// contrairement aux villes des quatre autres pays où l'écart est plus fréquent (Bruxelles/Brussels/
// Brussel, Séville/Sevilla/Seville...) : le gain attendu pour la France serait donc marginal, pour
// un effort disproportionné (reconstituer un rapprochement fiable geonameid <-> commune IGN).
//
// Reproduit ICI la même extraction que build-country-communes.js (mêmes filtres, même
// dédoublonnage, même jointure code postal) plutôt que d'appeler ce script : le seul besoin
// supplémentaire est de garder le geonameid sur l'entrée choisie, pour la relier ensuite aux noms
// alternatifs — dupliquer ce petit calcul évite de complexifier l'autre script, déjà stable, pour
// un besoin qui ne concerne que celui-ci.
const fs = require('fs');
const path = require('path');

const COUNTRIES = ['CZ']; // AD/ES/PT/BE/NL/LU/CH/DE/IT/AT/SM/LI/MC/MT/GG/JE déjà générés et commités
// (public/data/aliases-ad|es|pt|be|nl|lu|ch|de|it|at|sm|li|mc|mt|gg|je.txt)
const KEEP_FEATURE_CODES = new Set(['PPL','PPLA','PPLA2','PPLA3','PPLA4','PPLA5','PPLC','PPLF','PPLG','PPLL','PPLS']);
// Les langues couvertes par l'interface (voir public/js/i18n.js, SUPPORTED) — un alias dans une
// langue non encore proposée ne servirait à rien pour l'instant. "lb" (luxembourgeois) depuis
// l'ajout du Luxembourg ; "it"/"rm" (italien/romanche) depuis l'ajout de la Suisse — GeoNames
// utilise "rm" pour le romanche (isolanguage ISO 639-1), comme public/js/i18n.js. "nds"/"hsb"/"frr"
// (bas-allemand/sorabe/frison du Nord, ISO 639-2/3 — pas de code 639-1 pour ces trois) depuis
// l'ajout de l'Allemagne. "sc"/"fur"/"lld" (sarde/frioulan/ladin, ISO 639-1 pour le sarde, 639-2/3
// pour les deux autres) depuis l'ajout de l'Italie — "lld" reste dans cet ensemble par cohérence,
// mais ne produira JAMAIS d'alias en pratique : les 91 lignes "lld" du fichier alternateNamesV2
// italien pointent toutes vers des sommets/massifs (Aspromonte, Nebrodi, Monte Linas...), aucune
// vers une commune (feature class P) — GeoNames n'a tout simplement pas de toponymie ladine pour
// les localités, contrairement au sarde/frioulan qui, eux, en ont une réelle. Le ladin reste malgré
// tout une langue d'interface complète (public/js/i18n.js) : seule la recherche de ville par son nom
// ladin n'est pas possible, exactement comme pour la France (aucun aliasFile du tout, voir plus haut).
// "mt" (maltais, ISO 639-1) depuis l'ajout de Malte. "lij" (ligure, ISO 639-3 — le monégasque n'a
// PAS son propre code, voir COUNTRIES/app.js) depuis l'ajout de Monaco, même si GeoNames n'a
// vraisemblablement aucune ligne "lij" à proposer (langue quasi absente des bases de données
// existantes). "nrf-je"/"nrf-gg" (jèrriais/guernésiais) depuis l'ajout de Jersey/Guernesey — voir
// LANG_OUTPUT_REMAP_BY_COUNTRY juste en dessous : GeoNames n'utilise qu'un seul code ISO 639-3
// ("nrf", Norman) pour les DEUX variantes, la RA ISO 639-3 les ayant fusionnées faute d'assez les
// distinguer ; le sous-tag IETF régional (nrf-JE/nrf-GG, aussi utilisé par Wikipédia pour ce même
// besoin) permet de les garder comme deux langues d'interface bien séparées malgré ce code commun.
const SUPPORTED_LANGS = new Set(['fr', 'en', 'es', 'pt', 'nl', 'de', 'lb', 'it', 'rm', 'nds', 'hsb', 'frr', 'sc', 'fur', 'lld', 'mt', 'lij', 'nrf-je', 'nrf-gg']);
// Le sorabe (voir "Langues" du README) est traité comme une SEULE langue dans l'interface bien que
// GeoNames distingue haut-sorabe ("hsb", Saxe) et bas-sorabe ("dsb", Brandebourg) — deux langues très
// proches et mutuellement peu intelligibles à l'écrit, mais dont ni l'une ni l'autre n'a un nombre de
// locuteurs justifiant une entrée séparée dans le sélecteur de langue (haut-sorabe ~13 000, bas-sorabe
// ~7 000). Les alias "dsb" de GeoNames sont donc repliés sur le tag de sortie "hsb" (le plus parlé des
// deux) plutôt qu'ignorés — un alias bas-sorabe reste un alias sorabe valide pour la recherche de ville,
// même s'il ne correspond pas exactement à l'écriture haut-sorabe utilisée dans public/js/i18n.js.
const LANG_OUTPUT_REMAP = { dsb: 'hsb' };
// Remap supplémentaire, PAR PAYS cette fois (contrairement à LANG_OUTPUT_REMAP ci-dessus, global) :
// le même code source GeoNames "nrf" doit devenir "nrf-je" pour les alias de Jersey mais "nrf-gg"
// pour ceux de Guernesey — un remap global unique ne pourrait pas faire cette distinction, qui ne
// dépend que du pays en cours de traitement (voir la boucle plus bas).
const LANG_OUTPUT_REMAP_BY_COUNTRY = {
  JE: { nrf: 'nrf-je' },
  GG: { nrf: 'nrf-gg' }
};
const NAME_OVERRIDES = {
  'Lisbon': 'Lisboa',
  'Brussels': 'Bruxelles',
  'Antwerp': 'Antwerpen',
  'Ostend': 'Oostende',
  'Saint-Vith': 'Sankt Vith',
  'The Hague': 'Den Haag',
  'Geneva': 'Genève',
  'Sitten': 'Sion',
  'Munich': 'München',
  'Nuremberg': 'Nürnberg',
  'Rome': 'Roma',
  'Milan': 'Milano',
  'Naples': 'Napoli',
  'Turin': 'Torino',
  'Genoa': 'Genova',
  'Florence': 'Firenze',
  'Padua': 'Padova',
  'Venice': 'Venezia',
  'Vienna': 'Wien',
  'Prague': 'Praha',
  'Pilsen': 'Plzeň'
};
// Même exclusion que build-country-communes.js (voir son commentaire pour le détail) : Sercq n'a
// aucune liaison en ferry pour véhicules, un alias y menant ne servirait donc à rien côté recherche
// (la commune elle-même est absente de communes-gg.txt).
const SARK_EXCLUDE_NAMES = new Set(['Sark', 'La Seigneurie']);

function haversineKm(lat1, lon1, lat2, lon2){
  const R = 6371;
  const dLat = (lat2-lat1) * Math.PI/180, dLon = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function buildGrid(points){
  const grid = new Map();
  const cell = (lat, lon) => Math.round(lat*10) + '_' + Math.round(lon*10);
  points.forEach(p => {
    const k = cell(p.lat, p.lon);
    if(!grid.has(k)) grid.set(k, []);
    grid.get(k).push(p);
  });
  return { grid, cell };
}
function nearest(gridObj, lat, lon, maxKm){
  const { grid } = gridObj;
  const cLat = Math.round(lat*10), cLon = Math.round(lon*10);
  let best = null, bestDist = Infinity;
  for(let dLat=-1; dLat<=1; dLat++){
    for(let dLon=-1; dLon<=1; dLon++){
      const bucket = grid.get((cLat+dLat) + '_' + (cLon+dLon));
      if(!bucket) continue;
      for(const p of bucket){
        const d = haversineKm(lat, lon, p.lat, p.lon);
        if(d < bestDist){ bestDist = d; best = p; }
      }
    }
  }
  return (best && bestDist <= maxKm) ? best : null;
}
// Normalisation légère (minuscules, sans accents) pour comparer un alias au nom canonique et
// écarter les paires identiques (ex. beaucoup de lignes GeoNames répètent juste le nom local sous
// plusieurs codes langue — "Sant Julià de Lòria" en de/pt/nl : ce n'est pas une vraie traduction).
function normalize(s){
  return String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

for(const country of COUNTRIES){
  const dumpRaw = fs.readFileSync(path.join(__dirname, 'dump', country + '_dump.txt'), 'utf8');
  const postalRaw = fs.readFileSync(path.join(__dirname, 'postal', country + '_postal.txt'), 'utf8');
  const altRaw = fs.readFileSync(path.join(__dirname, 'altnames', country + '.txt'), 'utf8');

  const postalPoints = postalRaw.split('\n').filter(Boolean).map(line => {
    const c = line.split('\t');
    return { postcode: c[1], code1: c[4] || '', lat: parseFloat(c[9]), lon: parseFloat(c[10]) };
  }).filter(p => !isNaN(p.lat) && !isNaN(p.lon));
  const postalGrid = buildGrid(postalPoints);
  const postalByAdmin1Code = new Map();
  if(country === 'AD'){
    postalPoints.forEach(p => { if(p.code1) postalByAdmin1Code.set(p.code1, p); });
  }

  const rows = dumpRaw.split('\n').filter(Boolean).map(line => line.split('\t'));
  const places = rows
    .filter(c => c[6] === 'P' && KEEP_FEATURE_CODES.has(c[7]))
    .map(c => ({
      geonameid: c[0],
      name: NAME_OVERRIDES[c[1]] || c[1],
      lat: parseFloat(c[4]),
      lon: parseFloat(c[5]),
      admin1Code: c[10] || '',
      pop: parseInt(c[14], 10) || 0
    }))
    .filter(p => !isNaN(p.lat) && !isNaN(p.lon) && p.name)
    .filter(p => !(country === 'GG' && SARK_EXCLUDE_NAMES.has(p.name)));

  const seen = new Map();
  for(const p of places){
    const key = p.name.toLowerCase() + '|' + p.lat.toFixed(2) + '|' + p.lon.toFixed(2);
    const existing = seen.get(key);
    if(!existing || p.pop > existing.pop) seen.set(key, p);
  }
  // geonameid -> nom canonique final, UNIQUEMENT pour les communes qui ont bien survécu à la
  // jointure code postal (donc réellement présentes dans public/data/communes-XX.txt) — un alias
  // pointant vers une commune absente du fichier ne servirait à rien côté recherche.
  const canonicalByGeonameId = new Map();
  for(const p of seen.values()){
    const near = (country === 'AD') ? (postalByAdmin1Code.get(p.admin1Code) || null) : nearest(postalGrid, p.lat, p.lon, 15);
    if(near) canonicalByGeonameId.set(p.geonameid, p.name);
  }

  // Fichier alternateNames : alternateNameId, geonameid, isolanguage, alternate name,
  // isPreferredName, isShortName, isColloquial, isHistoric, from, to.
  const aliasRows = altRaw.split('\n').filter(Boolean).map(line => line.split('\t'));
  const seenAlias = new Set(); // dédoublonnage (lang, alias, canonical) — plusieurs lignes GeoNames
  // donnent parfois exactement la même correspondance (variantes préférée/courte du même nom).
  const countryRemap = LANG_OUTPUT_REMAP_BY_COUNTRY[country] || {};
  const out = [];
  for(const c of aliasRows){
    const geonameid = c[1], rawLang = c[2], alt = c[3], isHistoric = c[7];
    // ex. "dsb" (bas-sorabe) -> "hsb" partout ; "nrf" -> "nrf-je"/"nrf-gg" seulement pour Jersey/
    // Guernesey (voir LANG_OUTPUT_REMAP_BY_COUNTRY plus haut) — le remap par pays a priorité.
    const lang = countryRemap[rawLang] || LANG_OUTPUT_REMAP[rawLang] || rawLang;
    if(!SUPPORTED_LANGS.has(lang)) continue;
    if(isHistoric === '1') continue;
    const canonical = canonicalByGeonameId.get(geonameid);
    if(!canonical || !alt) continue;
    if(normalize(alt) === normalize(canonical)) continue; // pas une vraie variante
    const dedupeKey = lang + '|' + normalize(alt) + '|' + canonical;
    if(seenAlias.has(dedupeKey)) continue;
    seenAlias.add(dedupeKey);
    out.push(`${lang};${alt};${canonical}`);
  }

  const outPath = path.join(__dirname, '..', 'public', 'data', 'aliases-' + country.toLowerCase() + '.txt');
  fs.writeFileSync(outPath, out.join('\n') + (out.length ? '\n' : ''), 'utf8');
  console.log(country, ':', canonicalByGeonameId.size, 'communes couvertes ->', out.length, 'alias ->', outPath);
}
