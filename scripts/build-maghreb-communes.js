// Script ponctuel pour le MAROC, l'ALGÉRIE, la TUNISIE et le SAHARA OCCIDENTAL ("EH") — les quatre
// territoires ajoutés dans ce même passage. Format de sortie identique aux autres pays :
// population;lon,lat;cp1,cp2,...;region;nom
//
// Aucun des quatre ne passe par build-country-communes.js : ils demandent chacun un traitement
// différent, établi en inspectant les sources AVANT d'écrire quoi que ce soit (voir README.md,
// section "Pays couverts", pour le détail et les mesures).
//
// ── ALGÉRIE ────────────────────────────────────────────────────────────────────────────────────
// Le seul des quatre avec un VRAI fichier de codes postaux GeoNames utilisable : 15 951 entrées,
// 3 162 codes distincts, toutes géolocalisées, et surtout CONTENANT les codes des grandes villes
// (16000 Alger, 31000 Oran, 25000 Constantine, 09000 Blida... tous présents, vérifié). Rapprochement
// par COORDONNÉE la plus proche comme pour la Grèce, MAIS avec un garde-fou supplémentaire absent du
// pipeline standard : le point postal retenu doit appartenir à la MÊME WILAYA que le lieu. Sans ce
// contrôle, Blida héritait du code 35012 de Boumerdès, le point postal le plus proche à vol d'oiseau
// se trouvant de l'autre côté d'une limite de wilaya.
// PIÈGE IMPORTANT : les deux fichiers n'utilisent PAS le même référentiel admin1, bien qu'ils
// partagent l'apparence (deux chiffres). Le dump porte le code interne GeoNames ("01" = Alger),
// le fichier de codes postaux porte le NUMÉRO OFFICIEL de wilaya ("01" = Adrar). Comparer les deux
// directement écartait 7 293 lieux sur 8 139 — c'est ce qu'a montré le premier essai. La comparaison
// se fait donc par NOM de wilaya, en passant par admin1CodesASCII.txt (GeoNames) pour traduire le
// code du dump en nom, et en normalisant les accents des deux côtés (Béjaïa/Bejaia, Tébessa/Tebessa).
//
// ── MAROC ──────────────────────────────────────────────────────────────────────────────────────
// GeoNames publie bien un fichier export/zip/MA.zip, mais il est INUTILISABLE : 1 325 entrées
// seulement, exclusivement rurales. AUCUN des codes de grande ville n'y figure — 20000 Casablanca,
// 10000 Rabat, 40000 Marrakech, 90000 Tanger, 30000 Fès, 80000 Agadir, 50000 Meknès, 14000 Kénitra :
// tous absents, vérifié un par un. Un rapprochement par coordonnée produit donc des codes FAUX pour
// les villes qui comptent : essai fait avant d'abandonner cette voie, Casablanca ressortait avec le
// code 29640 (Mediouna) et Kénitra avec 12122 (Skhirate-Temara). Publier ces codes-là aurait été une
// erreur silencieuse, exactement ce que ce projet refuse.
// Le champ "cp" retombe donc sur le code de RÉGION ISO 3166-2:MA (12 régions depuis la réforme de
// 2015), comme pour l'Égypte et les autres pays du lot précédent — pas un vrai code postal, et
// documenté comme tel. La numérotation admin1 de GeoNames coïncide exactement avec la numérotation
// ISO (01 = Tanger-Tétouan-Al Hoceïma ... 12 = Dakhla-Oued Ed-Dahab), vérifié sur admin1CodesASCII.
// Quatre lieux isolés portent un admin1 hors de cette plage (51, 57, 59, et un vide) : un seul lieu
// chacun, écartés faute de correspondance ISO plutôt que rattachés arbitrairement.
//
// ── TUNISIE ────────────────────────────────────────────────────────────────────────────────────
// AUCUN fichier de codes postaux GeoNames (export/zip/TN.zip -> 404), alors que la Tunisie a un vrai
// système à 4 chiffres en usage depuis le 20 mars 1980. La Poste Tunisienne (poste.tn/codes.php)
// n'est pas joignable et ne publie pas de jeu ouvert ; l'article Wikipedia ne donne que des PRÉFIXES
// par gouvernorat, comme pour le Kosovo. Un jeu tiers a été retenu en dernier recours, exactement
// comme yell.ge pour la Géorgie et postanskibroj pour le Monténégro, et documenté avec la même
// réserve : mn-youssef/state-municipality-tunisia (scripts/tn-postal-raw.json), 4 788 localités avec
// code à 4 chiffres ET coordonnées, couvrant les 24 gouvernorats. PAS une source officielle, AUCUNE
// licence déclarée sur le dépôt. Contrôles passés avant adoption : 100 % des codes au format 4
// chiffres, 0 point hors des limites de la Tunisie, et 97 % des lieux GeoNames à moins de 15 km d'un
// point du jeu. Rapprochement par coordonnée la plus proche, même plafond de 15 km qu'ailleurs.
//
// ── SAHARA OCCIDENTAL ──────────────────────────────────────────────────────────────────────────
// Territoire non autonome selon l'ONU. Le projet suit GeoNames TEL QUEL, sans retouche éditoriale
// politique — même principe que pour le nord de Chypre, le Kosovo et la Crimée ailleurs dans ce
// projet : GeoNames publie un code pays "EH" distinct, on le reprend tel quel, ce qui ne constitue
// une prise de position d'aucune sorte. À noter, toujours sans retouche : GeoNames répartit lui-même
// le territoire entre "EH" (49 lieux) et les régions marocaines MA-11/MA-12 (12 lieux) ; les deux
// sont repris tels qu'ils viennent.
// Ni codes postaux (export/zip/EH.zip -> 404), ni subdivision exploitable : le champ admin1 de
// GeoNames ne contient que "00" (20 lieux), "CE" (1 lieu, Dakhla) et du vide (29 lieux, dont Laâyoune
// la plus peuplée), et EH n'apparaît PAS DU TOUT dans admin1CodesASCII. ISO 3166-2:EH n'a par
// ailleurs aucune subdivision. Le champ "cp" porte donc une étiquette unique "EH", informelle et
// documentée comme telle — même solution que les étiquettes "PS-WBK"/"PS-GZA" du lot précédent.
const fs = require('fs');
const path = require('path');
// Corrections communes à tous les générateurs de lieux (audit n° 11) : noms nettoyés, lieux écartés, quasi-doublons —
// voir scripts/communes-corrections.js.
const { excludePlace, preparePlaceName, dropNearDuplicates } = require('./communes-corrections.js');

const KEEP_FEATURE_CODES = new Set(['PPL','PPLA','PPLA2','PPLA3','PPLA4','PPLA5','PPLC','PPLF','PPLG','PPLL','PPLS']);

// Corrections d'exonymes : chacune a été vérifiée dans la liste de noms alternatifs GeoNames de
// L'ENTRÉE ELLE-MÊME (champ de langue "fr"), comme pour la Turquie/l'Azerbaïdjan/la Syrie — jamais
// d'après une connaissance générale. Les noms déjà corrects dans le dump (Casablanca, Rabat, Salé,
// Agadir, Oujda, Tétouan, Safi, Nador, Oran, Constantine, Blida, Sétif, Tlemcen, Tunis, Sfax,
// Sousse, Bizerte, Dakhla...) ne figurent évidemment pas ici.
const NAME_OVERRIDES_BY_COUNTRY = {
  MA: { 'Fes': 'Fès', 'Tangier': 'Tanger', 'Marrakesh': 'Marrakech', 'Meknes': 'Meknès',
    'Kenitra': 'Kénitra' },
  DZ: { 'Algiers': 'Alger' },
  TN: {},
  EH: { 'Laayoune': 'Laâyoune' }
};

// Noms de région repris d'admin1CodesASCII (GeoNames), pas réécrits.
const MA_REGIONS = {
  '01': 'Tanger-Tetouan-Al Hoceima', '02': 'Oriental', '03': 'Fes-Meknes',
  '04': 'Rabat-Salé-Kénitra', '05': 'Beni Mellal-Khenifra', '06': 'Casablanca-Settat',
  '07': 'Marrakesh-Safi', '08': 'Drâa-Tafilalet', '09': 'Souss-Massa',
  '10': 'Guelmim-Oued Noun', '11': 'Laayoune-Sakia El Hamra', '12': 'Dakhla-Oued Ed-Dahab'
};

// Îles Kerkennah : archipel tunisien SANS liaison routière avec le continent (contrairement à Djerba, reliée
// par la chaussée romaine d'El Kantara). Exclues lors du lot Maghreb, le moteur ne sachant pas encore séparer
// une île du continent ; RÉINTÉGRÉES en septembre 2026 depuis que les règles d'îles existent
// (scripts/iles/iles-corrections.js, masse « kerkennah » et liaison Sfax ↔ Sidi Youssef). Même boîte de
// coordonnées, désormais utilisée seulement pour compter ces lieux.
function isKerkennah(lat, lon){ return lat >= 34.55 && lat <= 34.82 && lon >= 10.95 && lon <= 11.35; }

// Clé de comparaison de noms de localités tunisiennes : minuscules, sans accents ni ponctuation, sans article
// « el »/« ech »/« er » détaché, sans espaces (« Djouaber » et « Jouaber » restent distincts, faute de règle sûre).
function locKey(s){
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(el|ech|er|es|ed|et)[- ]/g, '').replace(/[^a-z]/g, '');
}

// Normalisation de nom de division administrative, pour comparer les deux référentiels algériens.
function normAdmin(s){
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '').trim();
}
// Deux wilayas portent un nom différent de part et d'autre : GeoNames écrit l'exonyme anglais
// "Algiers" là où le fichier postal écrit "Alger", et "El Tarf" là où il écrit "El-Taref" (même
// wilaya الطارف, translittération flottante). Correspondances évidentes, vérifiées dans la liste des
// 48 noms de wilaya du fichier postal.
const DZ_WILAYA_ALIASES = { algiers: 'alger', eltarf: 'eltaref' };

// Les DIX wilayas créées par la réforme de 2019 (Timimoun, Bordj Badji Mokhtar, Béni Abbès, In Salah,
// In Guezzam, Djanet, El Menia, Touggourt, El M'Ghair, Ouled Djellal) n'existent PAS dans le fichier
// de codes postaux, plus ancien : leurs lieux étaient alors rattachés à leur wilaya d'origine. Plutôt
// que d'affirmer une filiation wilaya par wilaya qui ne serait pas sourcée ici, le contrôle de wilaya
// est simplement DÉSACTIVÉ pour ces dix codes — le plafond de 15 km reste seul en vigueur, et il est
// d'autant plus protecteur que ces wilayas sont sahariennes, avec des points postaux très espacés.
// 360 lieux concernés sur 8 139.
const DZ_WILAYAS_2019 = new Set(['TM', 'BB', 'BA', 'IS', 'IG', 'DJ', 'EM', 'TG', 'MG', 'OD']);

// admin1CodesASCII.txt (GeoNames) : "DZ.01<TAB>Algiers<TAB>..." -> code interne GeoNames -> nom.
function readAdmin1Names(country){
  const map = new Map();
  fs.readFileSync(path.join(__dirname, 'admin1CodesASCII.txt'), 'utf8').split('\n').forEach(l => {
    const f = l.split('\t');
    if(!f[0] || f[0].indexOf(country + '.') !== 0) return;
    map.set(f[0].slice(country.length + 1), normAdmin(f[1]));
  });
  return map;
}

function haversineKm(lat1, lon1, lat2, lon2){
  const R = 6371, t = Math.PI/180;
  const dLat = (lat2-lat1)*t, dLon = (lon2-lon1)*t;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*t)*Math.cos(lat2*t)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}
// Grille de 0,5° pour éviter un balayage complet des points postaux à chaque lieu.
function buildGrid(points){
  const g = new Map();
  points.forEach(p => {
    const k = Math.floor(p.lat/0.5) + '|' + Math.floor(p.lon/0.5);
    if(!g.has(k)) g.set(k, []);
    g.get(k).push(p);
  });
  return g;
}
function nearest(grid, lat, lon, maxKm, accept){
  let best = null, bd = Infinity;
  const ci = Math.floor(lat/0.5), cj = Math.floor(lon/0.5);
  for(let i=ci-1; i<=ci+1; i++){
    for(let j=cj-1; j<=cj+1; j++){
      const bucket = grid.get(i + '|' + j);
      if(!bucket) continue;
      for(const p of bucket){
        if(accept && !accept(p)) continue;
        const d = haversineKm(lat, lon, p.lat, p.lon);
        if(d < bd){ bd = d; best = p; }
      }
    }
  }
  return bd <= maxKm ? best : null;
}

function readPlaces(country){
  const raw = fs.readFileSync(path.join(__dirname, 'dump', country + '_dump.txt'), 'utf8');
  const overrides = NAME_OVERRIDES_BY_COUNTRY[country] || {};
  const places = raw.split('\n').filter(Boolean).map(l => l.split('\t'))
    .filter(c => c[6] === 'P' && KEEP_FEATURE_CODES.has(c[7]) && !excludePlace(country, c[0], preparePlaceName(country, c[0], overrides[c[1]] || c[1]), parseFloat(c[4]), parseFloat(c[5]))) // 13e audit du 19/09/2026 : filtre sur le nom publié (renommages compris), voir communes-corrections.js
    .map(c => ({
      name: preparePlaceName(country, c[0], overrides[c[1]] || c[1]),
      lat: parseFloat(c[4]), lon: parseFloat(c[5]),
      admin1: c[10] || '', pop: parseInt(c[14], 10) || 0
    }))
    .filter(p => !isNaN(p.lat) && !isNaN(p.lon) && p.name);
  // Dédoublonnage identique au pipeline standard : même nom + coordonnées à ~1 km près.
  const seen = new Map();
  for(const p of places){
    const k = p.name.toLowerCase() + '|' + p.lat.toFixed(2) + '|' + p.lon.toFixed(2);
    const prev = seen.get(k);
    if(!prev || p.pop > prev.pop) seen.set(k, p);
  }
  return { brut: places.length, list: Array.from(seen.values()) };
}

function write(country, lines, note){
  lines = dropNearDuplicates(lines); // quasi-doublons (voir communes-corrections.js)
  const out = path.join(__dirname, '..', 'public', 'data', 'communes-' + country.toLowerCase() + '.txt');
  fs.writeFileSync(out, lines.join('\n') + '\n', 'utf8');
  console.log(country + ' : ' + lines.length + ' communes -> ' + out + (note ? '  [' + note + ']' : ''));
}

// ── MAROC ──────────────────────────────────────────────────────────────────────────────────────
{
  const { brut, list } = readPlaces('MA');
  let sansRegion = 0;
  const lines = list.map(p => {
    const region = MA_REGIONS[p.admin1];
    if(!region){ sansRegion++; return null; }
    return `${p.pop};${p.lon.toFixed(4)},${p.lat.toFixed(4)};MA-${p.admin1};${region};${p.name}`;
  }).filter(Boolean);
  write('MA', lines, brut + ' bruts, ' + list.length + ' dédoublonnés, ' + sansRegion + ' sans région ISO');
}

// ── ALGÉRIE ────────────────────────────────────────────────────────────────────────────────────
{
  const { brut, list } = readPlaces('DZ');
  const pts = fs.readFileSync(path.join(__dirname, 'postal', 'DZ_postal.txt'), 'utf8')
    .split('\n').filter(Boolean).map(l => l.split('\t'))
    .map(c => ({ cp: c[1], admin1: c[4] || '', region: c[3] || '', lat: parseFloat(c[9]), lon: parseFloat(c[10]) }))
    .filter(p => !isNaN(p.lat) && !isNaN(p.lon));
  const grid = buildGrid(pts);
  const dzNames = readAdmin1Names('DZ');
  let horsWilaya = 0, sansCode = 0;
  const lines = list.map(p => {
    // garde-fou : on n'accepte qu'un point postal de la MÊME wilaya que le lieu, comparée par NOM
    let wilaya = dzNames.get(p.admin1) || null;
    if(wilaya && DZ_WILAYA_ALIASES[wilaya]) wilaya = DZ_WILAYA_ALIASES[wilaya];
    if(DZ_WILAYAS_2019.has(p.admin1)) wilaya = null; // réforme de 2019, voir commentaire plus haut
    const near = nearest(grid, p.lat, p.lon, 15, q => !wilaya || normAdmin(q.region) === wilaya);
    if(!near){
      if(nearest(grid, p.lat, p.lon, 15, null)) horsWilaya++; else sansCode++;
      return null;
    }
    return `${p.pop};${p.lon.toFixed(4)},${p.lat.toFixed(4)};${near.cp};${near.region};${p.name}`;
  }).filter(Boolean);
  write('DZ', lines, brut + ' bruts, ' + list.length + ' dédoublonnés, ' + horsWilaya +
    ' écartés par le contrôle de wilaya, ' + sansCode + ' sans point postal à moins de 15 km');
}

// ── TUNISIE ────────────────────────────────────────────────────────────────────────────────────
{
  const { brut, list } = readPlaces('TN');
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'tn-postal-raw.json'), 'utf8'));
  const pts = [];
  raw.forEach(g => (g.Delegations || []).forEach(d => {
    const lat = Number(d.Latitude), lon = Number(d.Longitude);
    if(isFinite(lat) && isFinite(lon) && /^\d{4}$/.test(String(d.PostalCode))){
      // Localité entre parenthèses dans le nom (« KERKENAH (Mellita) ») : sert à départager les codes d'une même
      // délégation, qui partagent tous les coordonnées du chef-lieu dans cette source.
      const loc = (String(d.Name).match(/\(([^)]*)\)/) || [])[1] || '';
      pts.push({ cp: String(d.PostalCode), region: g.Name, lat: lat, lon: lon, loc: locKey(loc) });
    }
  }));
  const grid = buildGrid(pts);
  let kerkennah = 0, sansCode = 0, parLocalite = 0;
  const lines = list.map(p => {
    if(isKerkennah(p.lat, p.lon)) kerkennah++;
    let near = nearest(grid, p.lat, p.lon, 15, null);
    if(!near){ sansCode++; return null; }
    // Plusieurs codes au même point (même délégation) : si l'un porte le nom de la localité du lieu, on le prend
    // plutôt que le premier de la liste (avant septembre 2026, tous les lieux d'une délégation recevaient le même
    // code, ex. 3045 pour tout l'archipel des Kerkennah).
    const sameSpot = pts.filter(q => q.lat === near.lat && q.lon === near.lon && q.region === near.region);
    const byName = sameSpot.filter(q => q.loc && q.loc === locKey(p.name));
    if(byName.length && byName[0].cp !== near.cp){ near = byName[0]; parLocalite++; }
    return `${p.pop};${p.lon.toFixed(4)},${p.lat.toFixed(4)};${near.cp};${near.region};${p.name}`;
  }).filter(Boolean);
  write('TN', lines, brut + ' bruts, ' + list.length + ' dédoublonnés, ' + kerkennah +
    ' aux Kerkennah (gardés), ' + parLocalite + ' codes choisis par nom de localité, ' + sansCode + ' sans code à moins de 15 km');
}

// ── SAHARA OCCIDENTAL ──────────────────────────────────────────────────────────────────────────
{
  const { brut, list } = readPlaces('EH');
  const lines = list.map(p => `${p.pop};${p.lon.toFixed(4)},${p.lat.toFixed(4)};EH;;${p.name}`);
  write('EH', lines, brut + ' bruts, ' + list.length + ' dédoublonnés, étiquette "EH" informelle');
}
