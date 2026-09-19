// Script ponctuel pour le Liban, Israël, la Palestine ("PS"), la Jordanie, l'Égypte et la Libye —
// les SIX pays ajoutés dans ce même passage. Comme la Syrie avant eux (voir build-sy-communes.js),
// GeoNames n'a AUCUN fichier de codes postaux pour aucun des six (export/zip/{LB,IL,PS,JO,EG,LY}.zip
// -> 404, vérifié pour chacun). Contrairement à la Syrie cependant, la plupart ont un VRAI système de
// codes postaux en usage — simplement sans source ouverte et exploitable listant les codes commune
// par commune :
// - Liban : système LibanPost à 4(+4) chiffres réel, mais aucune liste exhaustive par localité
//   trouvée (site officiel non accessible en automatisé, aucun annuaire tiers complet identifié).
// - Israël : système à 7 chiffres réel, mais calé au niveau de la RUE plutôt que de la commune — un
//   seul fichier tiers exploitable identifié (odata.org.il, extraction datée ~09/2020) est protégé
//   par un CAPTCHA Cloudflare, jamais contourné par principe (voir règles de sécurité de l'agent).
// - Palestine ("PS") : codes lancés en 2021 par l'Autorité palestinienne, décrits par un employé
//   postal cité dans la presse comme "plus symbolique que pratique" — aucune liste exploitable.
// - Jordanie : système à 5 chiffres réel, mais aucune liste exhaustive par localité en source
//   ouverte (site officiel protégé Cloudflare, bases tierces commerciales incomplètes/payantes).
// - Égypte : système à 5 chiffres réel, annuaires tiers gratuits (Egyxa) montrant des exemples
//   authentiques mais sans garantie de couverture pour les dizaines de milliers de localités d'un
//   pays de ~100 millions d'habitants — même prudence que pour la Géorgie/le Monténégro, mais ici
//   la taille du pays rend le risque d'erreur silencieuse plus élevé ; le repli par gouvernorat est
//   préféré à un rapprochement par nom non vérifiable à cette échelle.
// - Libye : aucun système exploitable identifié, cas le plus proche de la Syrie stricto sensu.
//
// PREMIER JEU DE CAS DE CE GENRE DANS CE PROJET (hors Syrie) : le champ "cp" utilise donc, pour les
// CINQ pays avec de vrais codes ISO 3166-2, le code de gouvernorat/district (LB/IL/JO/LY/EG) — une
// désambiguïsation plus grossière qu'un vrai code postal, documentée comme telle plutôt que présentée
// comme un vrai code postal. Pour la Palestine, GeoNames ne distingue que DEUX zones dans son propre
// champ admin1 ("WE" Cisjordanie, "GZ" bande de Gaza) — sans code ISO 3166-2 officiel correspondant à
// ce découpage précis (le vrai ISO 3166-2:PS liste 16 gouvernorats bien plus fins, que GeoNames ne
// distingue pas dans son champ admin1) : des étiquettes informelles "PS-WBK"/"PS-GZA" sont utilisées à
// la place, explicitement documentées comme non officielles. Même chose pour la poignée de localités
// classées "Judea and Samaria Area" dans le dump ISRAÉLIEN lui-même (admin1 "WE", 4 lieux seulement) :
// reprises telles quelles sous "IL-WBK" (informel), sans retouche éditoriale — même principe déjà
// appliqué au nord de Chypre/au Kosovo/à la Crimée ailleurs dans ce projet.
const fs = require('fs');
const path = require('path');
// Corrections communes à tous les générateurs de lieux (audit n° 11) : noms nettoyés, lieux écartés, quasi-doublons —
// voir scripts/communes-corrections.js.
const { excludePlace, preparePlaceName, dropNearDuplicates } = require('./communes-corrections.js');

const KEEP_FEATURE_CODES = new Set(['PPL','PPLA','PPLA2','PPLA3','PPLA4','PPLA5','PPLC','PPLF','PPLG','PPLL','PPLS']);

// Corrections d'exonymes/diacritiques confirmées par recoupement avec la liste de noms alternatifs
// GeoNames de chaque entrée (même méthode que pour la Syrie/la Turquie/l'Azerbaïdjan) — voir le
// commentaire détaillé par pays dans README.md, section "Pays couverts".
// Par pays plutôt qu'une seule table globale : "Tripoli" désigne à la fois une ville libanaise et la
// capitale libyenne dans leurs dumps GeoNames respectifs (même nom brut, deux entrées distinctes) —
// une table globale unique aurait appliqué par erreur la correction libanaise ("Trâblous") à la
// Tripoli libyenne aussi, un vrai bug détecté en relisant le résultat avant de committer.
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
  LB: {
    minPop: 500,
    admin1ToIso: {
      '04': 'LB-BA', '05': 'LB-JL', '09': 'LB-AS', '06': 'LB-JA',
      '08': 'LB-BI', '07': 'LB-NA', '10': 'LB-AK', '11': 'LB-BH'
    }
  },
  IL: {
    minPop: 1000,
    admin1ToIso: {
      '01': 'IL-M', '02': 'IL-D', '03': 'IL-Z', '04': 'IL-HA', '05': 'IL-TA', '06': 'IL-JM',
      'WE': 'IL-WBK' // informel, voir commentaire d'en-tête
    }
  },
  PS: {
    minPop: 1000,
    admin1ToIso: { 'WE': 'PS-WBK', 'GZ': 'PS-GZA' } // informels, voir commentaire d'en-tête
  },
  JO: {
    minPop: 1000,
    admin1ToIso: {
      '19': 'JO-MN', '18': 'JO-IR', '17': 'JO-AZ', '12': 'JO-AT', '16': 'JO-AM', '15': 'JO-MA',
      '09': 'JO-KA', '02': 'JO-BA', '20': 'JO-AJ', '22': 'JO-JA', '21': 'JO-AQ', '23': 'JO-MD'
    }
  },
  EG: {
    minPop: 1000,
    admin1ToIso: {
      '24': 'EG-SHG', '27': 'EG-SIN', '23': 'EG-KN', '22': 'EG-MT', '21': 'EG-KFS', '26': 'EG-JS',
      '20': 'EG-DT', '19': 'EG-PTS', '18': 'EG-BNS', '17': 'EG-AST', '16': 'EG-ASN', '15': 'EG-SUZ',
      '14': 'EG-SHR', '13': 'EG-WAD', '12': 'EG-KB', '11': 'EG-C', '10': 'EG-MN', '09': 'EG-MNF',
      '08': 'EG-GZ', '07': 'EG-IS', '06': 'EG-ALX', '05': 'EG-GH', '04': 'EG-FYM', '03': 'EG-BH',
      '02': 'EG-BA', '01': 'EG-DK', '28': 'EG-LX'
    }
  },
  LY: {
    minPop: 1000,
    admin1ToIso: {
      '70': 'LY-DR', '69': 'LY-BA', '66': 'LY-MJ', '65': 'LY-KF', '63': 'LY-JA', '77': 'LY-TB',
      '76': 'LY-SR', '75': 'LY-SB', '74': 'LY-NL', '73': 'LY-MQ', '72': 'LY-MI', '71': 'LY-GT',
      '68': 'LY-ZA', '78': 'LY-WS', '64': 'LY-JU', '67': 'LY-NQ', '79': 'LY-BU', '80': 'LY-JG',
      '81': 'LY-JI', '82': 'LY-MB', '83': 'LY-WA', '84': 'LY-WD'
    }
  }
};

for(const country of Object.keys(CONFIGS)){
  const { minPop, admin1ToIso } = CONFIGS[country];
  const nameOverrides = NAME_OVERRIDES_BY_COUNTRY[country] || {};
  const dumpRaw = fs.readFileSync(path.join(__dirname, 'dump', country + '_dump.txt'), 'utf8');
  const rows = dumpRaw.split('\n').filter(Boolean).map(line => line.split('\t'));
  const places = rows
    .filter(c => c[6] === 'P' && KEEP_FEATURE_CODES.has(c[7]) && !excludePlace(country, c[0], preparePlaceName(country, c[0], nameOverrides[c[1]] || c[1]), parseFloat(c[4]), parseFloat(c[5]))) // 13e audit du 19/09/2026 : filtre sur le nom publié (renommages compris), voir communes-corrections.js
    .map(c => ({
      name: preparePlaceName(country, c[0], nameOverrides[c[1]] || c[1]),
      lat: parseFloat(c[4]),
      lon: parseFloat(c[5]),
      admin1Code: c[10] || '',
      pop: parseInt(c[14], 10) || 0
    }))
    .filter(p => !isNaN(p.lat) && !isNaN(p.lon) && p.name && p.pop >= minPop);

  const seen = new Map();
  for(const p of places){
    const key = p.name.toLowerCase() + '|' + p.lat.toFixed(2) + '|' + p.lon.toFixed(2);
    const existing = seen.get(key);
    if(!existing || p.pop > existing.pop) seen.set(key, p);
  }
  const deduped = Array.from(seen.values());

  const lines = deduped.map(p => {
    const cp = admin1ToIso[p.admin1Code];
    if(!cp) return null;
    return `${p.pop};${p.lon.toFixed(4)},${p.lat.toFixed(4)};${cp};;${p.name}`;
  }).filter(Boolean);

  const outPath = path.join(__dirname, '..', 'public', 'data', 'communes-' + country.toLowerCase() + '.txt');
  fs.writeFileSync(outPath, dropNearDuplicates(lines).join('\n') + '\n', 'utf8'); // quasi-doublons (voir communes-corrections.js)
  console.log(country, ': ', rows.length, 'lignes brutes -> pop >=', minPop, '->', places.length,
    '->', deduped.length, 'dédoublonnés ->', lines.length, 'avec code ->', outPath);
}
