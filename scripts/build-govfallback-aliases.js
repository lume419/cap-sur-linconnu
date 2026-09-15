// Alias multilingues pour les six pays traités par build-govfallback-communes.js (Liban, Israël,
// Palestine, Jordanie, Égypte, Libye) — AUCUN des six n'a de fichier de codes postaux GeoNames, donc
// le script standard build-aliases.js (qui a besoin de postal/XX_postal.txt pour rejoindre les
// communes à un geonameid) ne peut pas s'appliquer tel quel. Reproduit ici la même extraction que
// build-govfallback-communes.js (mêmes filtres/seuils de population/corrections de nom) mais en
// conservant le geonameid de chaque commune retenue, pour le relier ensuite à altnames/XX.txt —
// SURTOUT UTILE ICI parce que plusieurs grandes villes ont été renommées vers leur nom local
// (Cairo->Al Qahirah, Beirut->Beyrouth, Jerusalem->Yerushalayim...) : sans alias, un visiteur tapant
// le nom anglais usuel de ces villes ne les trouverait plus du tout dans la recherche.
const fs = require('fs');
const path = require('path');

const KEEP_FEATURE_CODES = new Set(['PPL','PPLA','PPLA2','PPLA3','PPLA4','PPLA5','PPLC','PPLF','PPLG','PPLL','PPLS']);
function norm(s){ return s.trim().toLowerCase().replace(/\s+/g, ' '); }

const NAME_OVERRIDES_BY_COUNTRY = {
  LB: { 'Beirut': 'Beyrouth', 'Tripoli': 'Trâblous', 'Sidon': 'Saïda', 'Tyre': 'Soûr' },
  IL: { 'Jerusalem': 'Yerushalayim', 'Tel Aviv': 'Tel Aviv-Yafo', 'Jaffa': 'Yafo', 'Beersheba': "Be'er Sheva" },
  JO: { 'Amman': "'Amman" },
  EG: { 'Cairo': 'Al Qahirah', 'Alexandria': 'Al Iskandariyah', 'Port Said': "Bur Sa'id",
    'Suez': 'As Suways', 'Luxor': 'Al Uqsur' },
  LY: { 'Tripoli': 'Tarabulus', 'Benghazi': 'Banghazi', 'Tobruk': 'Tubruq' },
  PS: { 'Hebron': 'Al Khalil' }
};

const CONFIGS = {
  LB: { minPop: 500, admin1ToIso: {
    '04': 'LB-BA', '05': 'LB-JL', '09': 'LB-AS', '06': 'LB-JA',
    '08': 'LB-BI', '07': 'LB-NA', '10': 'LB-AK', '11': 'LB-BH'
  } },
  IL: { minPop: 1000, admin1ToIso: {
    '01': 'IL-M', '02': 'IL-D', '03': 'IL-Z', '04': 'IL-HA', '05': 'IL-TA', '06': 'IL-JM', 'WE': 'IL-WBK'
  } },
  PS: { minPop: 1000, admin1ToIso: { 'WE': 'PS-WBK', 'GZ': 'PS-GZA' } },
  JO: { minPop: 1000, admin1ToIso: {
    '19': 'JO-MN', '18': 'JO-IR', '17': 'JO-AZ', '12': 'JO-AT', '16': 'JO-AM', '15': 'JO-MA',
    '09': 'JO-KA', '02': 'JO-BA', '20': 'JO-AJ', '22': 'JO-JA', '21': 'JO-AQ', '23': 'JO-MD'
  } },
  EG: { minPop: 1000, admin1ToIso: {
    '24': 'EG-SHG', '27': 'EG-SIN', '23': 'EG-KN', '22': 'EG-MT', '21': 'EG-KFS', '26': 'EG-JS',
    '20': 'EG-DT', '19': 'EG-PTS', '18': 'EG-BNS', '17': 'EG-AST', '16': 'EG-ASN', '15': 'EG-SUZ',
    '14': 'EG-SHR', '13': 'EG-WAD', '12': 'EG-KB', '11': 'EG-C', '10': 'EG-MN', '09': 'EG-MNF',
    '08': 'EG-GZ', '07': 'EG-IS', '06': 'EG-ALX', '05': 'EG-GH', '04': 'EG-FYM', '03': 'EG-BH',
    '02': 'EG-BA', '01': 'EG-DK', '28': 'EG-LX'
  } },
  LY: { minPop: 1000, admin1ToIso: {
    '70': 'LY-DR', '69': 'LY-BA', '66': 'LY-MJ', '65': 'LY-KF', '63': 'LY-JA', '77': 'LY-TB',
    '76': 'LY-SR', '75': 'LY-SB', '74': 'LY-NL', '73': 'LY-MQ', '72': 'LY-MI', '71': 'LY-GT',
    '68': 'LY-ZA', '78': 'LY-WS', '64': 'LY-JU', '67': 'LY-NQ', '79': 'LY-BU', '80': 'LY-JG',
    '81': 'LY-JI', '82': 'LY-MB', '83': 'LY-WA', '84': 'LY-WD'
  } }
};

// Langues déjà couvertes par l'interface (public/js/i18n.js, SUPPORTED) — un alias dans une langue
// non proposée ne servirait à rien. "ar"/"he" : l'arabe est déjà langue d'interface (ajouté avec la
// Syrie) ; PAS l'hébreu (aucune langue ajoutée par ce lot de six pays, voir README "Langues" —
// l'hébreu langue d'Etat n'a pas de statut suffisant côté minorité pour justifier son propre ajout
// ici, il s'agit d'Israël lui-même qui n'apporte aucune NOUVELLE langue puisque aucune minorité ne
// remplit le critère legal-status du projet). Alias "he" tout de même utiles pour la RECHERCHE même
// sans être une langue d'INTERFACE — mais ce projet n'a jamais mélangé les deux usages ailleurs
// (aliases-XX.txt = fichier de recherche, langue d'interface = fichier différent) : "he" est donc
// AUSSI inclus ici comme langue de recherche, cohérent avec "ru" déjà inclus pour la Turquie/l'Ukraine
// alors que le russe n'est langue d'interface QUE depuis la Biélorussie.
const SUPPORTED_LANGS = new Set(['fr','en','es','pt','nl','de','it','ar','he','ru','el','tr']);

for(const country of Object.keys(CONFIGS)){
  const { minPop, admin1ToIso } = CONFIGS[country];
  const nameOverrides = NAME_OVERRIDES_BY_COUNTRY[country] || {};
  const dumpRaw = fs.readFileSync(path.join(__dirname, 'dump', country + '_dump.txt'), 'utf8');
  const rows = dumpRaw.split('\n').filter(Boolean).map(line => line.split('\t'));
  const places = rows
    .filter(c => c[6] === 'P' && KEEP_FEATURE_CODES.has(c[7]))
    .map(c => ({
      geonameid: c[0],
      name: nameOverrides[c[1]] || c[1],
      lat: parseFloat(c[4]),
      lon: parseFloat(c[5]),
      admin1Code: c[10] || '',
      pop: parseInt(c[14], 10) || 0
    }))
    .filter(p => !isNaN(p.lat) && !isNaN(p.lon) && p.name && p.pop >= minPop);

  const seen = new Map();
  for(const p of places){
    const key = norm(p.name) + '|' + p.lat.toFixed(2) + '|' + p.lon.toFixed(2);
    const existing = seen.get(key);
    if(!existing || p.pop > existing.pop) seen.set(key, p);
  }
  const canonicalByGeonameId = new Map();
  for(const p of seen.values()){
    if(admin1ToIso[p.admin1Code]) canonicalByGeonameId.set(p.geonameid, p.name);
  }

  const altPath = path.join(__dirname, 'altnames', country + '.txt');
  const out = [];
  if(fs.existsSync(altPath)){
    const seenAlias = new Set();
    const altRows = fs.readFileSync(altPath, 'utf8').split('\n').filter(Boolean).map(l => l.split('\t'));
    for(const c of altRows){
      const geonameid = c[1], lang = c[2], alt = c[3], isHistoric = c[7];
      if(!SUPPORTED_LANGS.has(lang)) continue;
      if(isHistoric === '1') continue;
      const canonical = canonicalByGeonameId.get(geonameid);
      if(!canonical || !alt) continue;
      if(norm(alt) === norm(canonical)) continue;
      const dedupeKey = lang + '|' + norm(alt) + '|' + canonical;
      if(seenAlias.has(dedupeKey)) continue;
      seenAlias.add(dedupeKey);
      out.push(`${lang};${alt};${canonical}`);
    }
  }
  const outPath = path.join(__dirname, '..', 'public', 'data', 'aliases-' + country.toLowerCase() + '.txt');
  fs.writeFileSync(outPath, out.join('\n') + (out.length ? '\n' : ''), 'utf8');
  console.log(country, ':', canonicalByGeonameId.size, 'communes couvertes ->', out.length, 'alias ->', outPath);
}
